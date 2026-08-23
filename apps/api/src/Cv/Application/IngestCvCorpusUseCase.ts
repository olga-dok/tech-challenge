import type { GenerationStreamEvent } from '@repo/contracts';
import { Observable, type Subscriber } from 'rxjs';
import type { Logger } from '../../Shared/Domain';
import type { Candidate } from '../Domain/Candidate';
import type { CvRepository } from '../Domain/CvRepository';
import type { CorpusIngester } from './CorpusIngester';
import type { CvIngester, IngestOutcome } from './CvIngester';
import type { IngestCvCorpusRequest } from './IngestCvCorpusRequest';

// A worker-pool cap, not the paced batching generation needs: the local
// embedder has no quota to respect, so the only limits worth having are CPU
// and open file handles.
const DEFAULT_CONCURRENCY = 4;

export interface IngestCvCorpusDependencies {
  readonly concurrency?: number;
  readonly now?: () => number;
  readonly logger?: Logger;
}

interface Tally {
  generated: number;
  skipped: number;
  failed: number;
  chunks: number;
}

/**
 * Indexes every stored candidate, reusing the generation stream's own event
 * union — `ingest_started` / `ingest_progress` / `done` already exist there
 * precisely so this use case needs no new contract. Implements
 * `CorpusIngester` so `GenerateCvCorpusUseCase` can chain straight into it
 * without knowing anything ingestion-specific.
 */
export class IngestCvCorpusUseCase implements CorpusIngester {
  private readonly logger?: Logger;
  private readonly now: () => number;
  private readonly concurrency: number;

  constructor(
    private readonly repository: CvRepository,
    private readonly ingester: CvIngester,
    dependencies: IngestCvCorpusDependencies = {},
  ) {
    this.logger = dependencies.logger?.forContext('IngestCvCorpus');
    this.now = dependencies.now ?? (() => Date.now());
    this.concurrency = dependencies.concurrency ?? DEFAULT_CONCURRENCY;
  }

  ingest(
    request: IngestCvCorpusRequest = {},
  ): Observable<GenerationStreamEvent> {
    return new Observable<GenerationStreamEvent>((subscriber) => {
      this.run(request, subscriber).catch((error: unknown) => {
        // Same shape as generation: exactly one terminal event either way, so
        // a client waiting on `done` is never left hanging.
        subscriber.next({
          type: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
        subscriber.complete();
      });
    });
  }

  private async run(
    request: IngestCvCorpusRequest,
    subscriber: Subscriber<GenerationStreamEvent>,
  ): Promise<void> {
    const startedAt = this.now();
    const candidates = await this.repository.findAll();

    subscriber.next({ type: 'ingest_started' });

    const tally: Tally = { generated: 0, skipped: 0, failed: 0, chunks: 0 };
    let completed = 0;

    await mapWithConcurrency(
      candidates,
      this.concurrency,
      async (candidate) => {
        const outcome = await this.ingestOneSafely(
          candidate,
          request.force ?? false,
        );

        if (outcome.status === 'ingested') {
          tally.generated += 1;
        } else if (outcome.status === 'skipped') {
          tally.skipped += 1;
        } else {
          tally.failed += 1;
        }
        tally.chunks += outcome.chunks;

        completed += 1;
        subscriber.next({
          type: 'ingest_progress',
          done: completed,
          total: candidates.length,
        });
      },
    );

    subscriber.next({
      type: 'done',
      summary: {
        generated: tally.generated,
        failed: tally.failed,
        skipped: tally.skipped,
        chunks: tally.chunks,
        durationMs: this.now() - startedAt,
      },
    });
    subscriber.complete();
  }

  /**
   * `CvIngester.ingestOne` already turns extraction failures into a typed
   * outcome, but an embedder or repository failure can still throw — caught
   * here so one bad candidate cannot abort the run for the rest, the same
   * per-file isolation generation gives each persona.
   */
  private async ingestOneSafely(
    candidate: Candidate,
    force: boolean,
  ): Promise<IngestOutcome> {
    try {
      return await this.ingester.ingestOne(candidate, force);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);

      this.logger?.warn('A candidate failed to ingest', {
        candidate: candidate.fullName,
        reason,
      });

      return { status: 'failed', chunks: 0, reason };
    }
  }
}

async function mapWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await fn(items[index]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
}
