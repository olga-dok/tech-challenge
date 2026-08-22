import type { GenerationStreamEvent } from '@repo/contracts';
import { Observable, type Subscriber } from 'rxjs';
import type { Logger } from '../../Shared/Domain';
import { Candidate } from '../Domain/Candidate';
import { CorpusPlan } from '../Domain/CorpusPlan';
import {
  intoBatches,
  nextBatchDelay,
  type BatchPacing,
} from '../Domain/corpusBatching';
import { templateIdFor } from '../Domain/CvTemplate';
import type { CvRepository } from '../Domain/CvRepository';
import type { CvStorage } from '../Domain/CvStorage';
import { isRateLimited } from '../Domain/isRateLimited';
import type { PdfRenderer } from '../Domain/PdfRenderer';
import type { Persona } from '../Domain/Persona';
import { personaChecksum } from '../Domain/personaChecksum';
import type { PortraitPainter } from '../Domain/PortraitPainter';
import type { ProfileDrafter } from '../Domain/ProfileDrafter';
import { Slug } from '../Domain/Slug';
import type { CorpusIngester } from './CorpusIngester';
import type { GenerateCvCorpusRequest } from './GenerateCvCorpusRequest';
import { toCandidateSummary } from './toCandidateSummary';

export interface GenerateCvCorpusDependencies {
  readonly plan?: typeof CorpusPlan.build;
  readonly pacing: BatchPacing;
  readonly batchSize: number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => number;
  readonly logger?: Logger;
  readonly ingester?: CorpusIngester;
}

interface PersonaOutcome {
  readonly kind: 'generated' | 'skipped';
  readonly candidate: Candidate;
}

/**
 * Builds the corpus and reports itself while doing it.
 *
 * Thirty CVs takes minutes on a free tier, so this returns a stream rather than
 * a promise: the gallery fills in card by card and there is always something on
 * screen. The same events drive the CLI, so a screen recording and a browser
 * show the same run.
 *
 * The shape of the run is sequential batches — see `intoBatches` for why that
 * beats a plain concurrency cap.
 */
export class GenerateCvCorpusUseCase {
  private readonly logger?: Logger;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly buildPlan: typeof CorpusPlan.build;

  constructor(
    private readonly repository: CvRepository,
    private readonly drafter: ProfileDrafter,
    private readonly painter: PortraitPainter,
    private readonly renderer: PdfRenderer,
    private readonly storage: CvStorage,
    private readonly dependencies: GenerateCvCorpusDependencies,
  ) {
    this.logger = dependencies.logger?.forContext('GenerateCvCorpus');
    this.sleep =
      dependencies.sleep ??
      ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.now = dependencies.now ?? (() => Date.now());
    // Wrapped rather than passed as a bare reference: `CorpusPlan.build` is a
    // static that never touches `this`, but handing a method around unbound is
    // the kind of thing that stops being true one refactor later.
    this.buildPlan =
      dependencies.plan ?? ((size, seed) => CorpusPlan.build(size, seed));
  }

  execute(request: GenerateCvCorpusRequest): Observable<GenerationStreamEvent> {
    return new Observable<GenerationStreamEvent>((subscriber) => {
      this.run(request, subscriber).catch((error: unknown) => {
        // Every failure leaves the stream through one event: a client that hangs
        // waiting for `done` is worse than one that is told it broke.
        subscriber.next({
          type: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
        subscriber.complete();
      });
    });
  }

  private async run(
    request: GenerateCvCorpusRequest,
    subscriber: Subscriber<GenerationStreamEvent>,
  ): Promise<void> {
    const startedAt = this.now();
    const { personas } = this.buildPlan(request.size, request.seed);
    const batchSize = request.batchSize ?? this.dependencies.batchSize;
    const batches = intoBatches(personas, batchSize);

    subscriber.next({
      type: 'plan',
      total: personas.length,
      batches: batches.length,
      batchSize,
    });

    // Read once, up front: asking per persona would be thirty round trips to
    // answer a question the first one already answered.
    const existing = request.force
      ? new Set<string>()
      : await this.repository.findChecksums();

    let delayMs = this.dependencies.pacing.batchDelayMs;
    const tally = { generated: 0, failed: 0, skipped: 0 };

    for (const [index, batch] of batches.entries()) {
      const batchNumber = index + 1;

      subscriber.next({
        type: 'batch_started',
        batch: batchNumber,
        of: batches.length,
        size: batch.length,
      });

      const results = await this.runBatch(
        batch,
        personas,
        existing,
        request,
        subscriber,
      );

      const batchTally = { generated: 0, failed: 0, skipped: 0 };
      let throttled = false;

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.kind === 'skipped') {
            batchTally.skipped += 1;
          } else {
            batchTally.generated += 1;
          }
          continue;
        }

        batchTally.failed += 1;
        throttled = throttled || isRateLimited(result.reason);
      }

      tally.generated += batchTally.generated;
      tally.failed += batchTally.failed;
      tally.skipped += batchTally.skipped;

      if (throttled) {
        delayMs = nextBatchDelay(delayMs, true, this.dependencies.pacing);
        // A distinct event, not a flavour of failure: being rate-limited on a
        // free tier is expected and recoverable, and the UI should say so.
        subscriber.next({ type: 'throttled', batch: batchNumber, delayMs });
      }

      const isLastBatch = batchNumber === batches.length;

      subscriber.next({
        type: 'batch_completed',
        batch: batchNumber,
        of: batches.length,
        generated: batchTally.generated,
        failed: batchTally.failed,
        skipped: batchTally.skipped,
        nextDelayMs: isLastBatch ? 0 : delayMs,
      });

      // The failed personas are simply absent; re-running picks them up through
      // checksum idempotency. Retrying the batch inline would put the retry
      // policy in two places.
      if (!isLastBatch && delayMs > 0) {
        await this.sleep(delayMs);
      }
    }

    const chunks = await this.ingest(subscriber);

    subscriber.next({
      type: 'done',
      summary: {
        generated: tally.generated,
        failed: tally.failed,
        skipped: tally.skipped,
        chunks,
        durationMs: this.now() - startedAt,
      },
    });
    subscriber.complete();
  }

  /**
   * `allSettled`, never `all`: one rejected CV must not abort its siblings. A
   * corpus of 28 of 30 is a success, and the two gaps are filled by generating
   * again.
   */
  private runBatch(
    batch: readonly Persona[],
    personas: readonly Persona[],
    existing: Set<string>,
    request: GenerateCvCorpusRequest,
    subscriber: Subscriber<GenerationStreamEvent>,
  ): Promise<PromiseSettledResult<PersonaOutcome>[]> {
    return Promise.allSettled(
      batch.map((persona) => {
        const index = personas.indexOf(persona);

        return this.generateOne(persona, index, existing, request, subscriber);
      }),
    );
  }

  private async generateOne(
    persona: Persona,
    index: number,
    existing: Set<string>,
    request: GenerateCvCorpusRequest,
    subscriber: Subscriber<GenerationStreamEvent>,
  ): Promise<PersonaOutcome> {
    const checksum = personaChecksum(persona);

    if (existing.has(checksum)) {
      const known = await this.repository.findByChecksum(checksum);

      if (known !== null) {
        // Still announced, so the gallery fills in on a resumed run rather than
        // looking empty until the missing CVs finish.
        subscriber.next({
          type: 'cv_completed',
          index,
          candidate: toCandidateSummary(known),
        });

        return { kind: 'skipped', candidate: known };
      }
    }

    subscriber.next({
      type: 'cv_started',
      index,
      personaLabel: `${persona.fullName} — ${persona.label()}`,
    });

    try {
      const candidate = await this.produce(persona);

      subscriber.next({
        type: 'cv_completed',
        index,
        candidate: toCandidateSummary(candidate),
      });

      return { kind: 'generated', candidate };
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);

      this.logger?.warn('A CV failed to generate', {
        candidate: persona.fullName,
        rateLimited: isRateLimited(error),
        reason,
      });
      subscriber.next({ type: 'cv_failed', index, reason });

      // Rethrown so the batch can tell a failure from a success, and so a
      // rate-limited failure can raise the pacing for the batches that follow.
      throw error;
    }
  }

  private async produce(persona: Persona): Promise<Candidate> {
    const profile = await this.drafter.draft(persona);
    const portrait = await this.painter.paint(persona);
    const templateId = templateIdFor(persona);
    const language = persona.cvLanguage;

    const pdf = await this.renderer.render({
      profile,
      portrait,
      templateId,
      language,
    });

    // The name the model produced wins over the persona's, so the slug matches
    // what the CV actually says.
    const slug = Slug.fromName(profile.fullName);
    const stored = await this.storage.write(slug, {
      pdf,
      portrait,
      profile,
    });

    return this.repository.save(
      Candidate.generated({
        slug,
        persona,
        profile,
        files: {
          pdfPath: stored.pdfPath,
          portraitPath: stored.portraitPath,
        },
        templateId,
      }),
    );
  }

  private async ingest(
    subscriber: Subscriber<GenerationStreamEvent>,
  ): Promise<number> {
    const ingester = this.dependencies.ingester;

    if (ingester === undefined) {
      return 0;
    }

    return new Promise<number>((resolve) => {
      let chunks = 0;

      ingester.ingest().subscribe({
        next: (event) => {
          if (event.type === 'done') {
            // The ingester's own `done` is swallowed: this stream has exactly
            // one terminal event, emitted by the caller with the full summary.
            chunks = event.summary.chunks;

            return;
          }

          subscriber.next(event);
        },
        error: (error: unknown) => {
          subscriber.next({
            type: 'error',
            message: `Indexing failed: ${error instanceof Error ? error.message : String(error)}`,
          });
          resolve(chunks);
        },
        complete: () => {
          resolve(chunks);
        },
      });
    });
  }
}
