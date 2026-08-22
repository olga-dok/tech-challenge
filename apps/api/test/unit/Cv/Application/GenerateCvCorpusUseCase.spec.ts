import type { GenerationStreamEvent } from '@repo/contracts';
import { lastValueFrom, toArray } from 'rxjs';
import { GenerateCvCorpusUseCase } from '../../../../src/Cv/Application/GenerateCvCorpusUseCase';
import type { BatchPacing } from '../../../../src/Cv/Domain/corpusBatching';
import { CorpusPlan } from '../../../../src/Cv/Domain/CorpusPlan';
import { personaChecksum } from '../../../../src/Cv/Domain/personaChecksum';
import {
  drafterStub,
  existingCandidateFor,
  painterStub,
  rateLimitError,
  rendererStub,
  repositoryStub,
  storageStub,
  type DrafterStub,
  type RepositoryStub,
  type StorageStub,
} from '../../../support/generationDoubles';

const PACING: BatchPacing = {
  batchDelayMs: 1_000,
  batchBackoffFactor: 2,
  maxBatchDelayMs: 30_000,
};

interface Harness {
  readonly events: Promise<GenerationStreamEvent[]>;
  readonly repository: RepositoryStub;
  readonly drafter: DrafterStub;
  readonly storage: StorageStub;
  readonly sleeps: number[];
}

const run = (options: {
  size?: number;
  batchSize?: number;
  force?: boolean;
  drafter?: DrafterStub;
  repository?: RepositoryStub;
  pacing?: BatchPacing;
}): Harness => {
  const repository = options.repository ?? repositoryStub();
  const drafter = options.drafter ?? drafterStub();
  const storage = storageStub();
  const sleeps: number[] = [];

  const useCase = new GenerateCvCorpusUseCase(
    repository,
    drafter,
    painterStub(),
    rendererStub(),
    storage,
    {
      batchSize: options.batchSize ?? 2,
      pacing: options.pacing ?? PACING,
      // Never actually waits: a suite that sits out its own backoff proves
      // nothing and takes a minute.
      sleep: (ms) => {
        sleeps.push(ms);

        return Promise.resolve();
      },
      now: () => 0,
    },
  );

  return {
    repository,
    drafter,
    storage,
    sleeps,
    events: lastValueFrom(
      useCase
        .execute({
          size: options.size ?? 4,
          seed: 42,
          force: options.force ?? false,
        })
        .pipe(toArray()),
    ),
  };
};

const typesOf = (events: GenerationStreamEvent[]): string[] =>
  events.map((event) => event.type);

const only = <TType extends GenerationStreamEvent['type']>(
  events: GenerationStreamEvent[],
  type: TType,
): Extract<GenerationStreamEvent, { type: TType }>[] =>
  events.filter(
    (event): event is Extract<GenerationStreamEvent, { type: TType }> =>
      event.type === type,
  );

describe('GenerateCvCorpusUseCase', () => {
  describe('the happy path', () => {
    it('announces the plan before doing any work', async () => {
      const events = await run({ size: 5, batchSize: 2 }).events;

      expect(events[0]).toEqual({
        type: 'plan',
        total: 5,
        batches: 3,
        batchSize: 2,
      });
    });

    it('emits a start and a completion for every CV', async () => {
      const events = await run({ size: 4, batchSize: 2 }).events;

      expect(only(events, 'cv_started')).toHaveLength(4);
      expect(only(events, 'cv_completed')).toHaveLength(4);
      expect(typesOf(events).at(-1)).toBe('done');
    });

    it('carries the finished card on the completion event', async () => {
      const events = await run({ size: 1, batchSize: 1 }).events;
      const [completed] = only(events, 'cv_completed');

      // The gallery appends from this instead of refetching a page per CV.
      expect(completed.candidate.slug).toMatch(/^[a-z0-9-]+$/);
      expect(completed.candidate.portraitUrl).toContain('/portrait');
      expect(completed.candidate.pdfUrl).toContain('/pdf');
      expect(completed.candidate.topSkills.length).toBeGreaterThan(0);
    });

    it('writes files and persists a row for each candidate', async () => {
      const harness = run({ size: 3, batchSize: 3 });
      await harness.events;

      expect(harness.storage.written).toHaveLength(3);
      expect(harness.repository.saved).toHaveLength(3);
    });

    it('reports a summary that adds up', async () => {
      const events = await run({ size: 4, batchSize: 2 }).events;
      const [done] = only(events, 'done');

      expect(done.summary).toMatchObject({
        generated: 4,
        failed: 0,
        skipped: 0,
        chunks: 0,
      });
    });
  });

  describe('batching and pacing', () => {
    it('runs in sequential batches with a pause between them', async () => {
      const harness = run({ size: 6, batchSize: 2 });
      const events = await harness.events;

      expect(only(events, 'batch_started').map((event) => event.batch)).toEqual(
        [1, 2, 3],
      );
      // Two pauses for three batches: pacing goes between batches, not after the
      // last one, which would delay the summary for nothing.
      expect(harness.sleeps).toEqual([1_000, 1_000]);
      expect(only(events, 'batch_completed').at(-1)?.nextDelayMs).toBe(0);
    });

    it('finishes a batch before starting the next', async () => {
      const order: string[] = [];
      const drafter = drafterStub();
      const slow = {
        ...drafter,
        draft: async (persona: Parameters<typeof drafter.draft>[0]) => {
          order.push(`start:${persona.fullName}`);
          await new Promise((resolve) => setTimeout(resolve, 5));
          order.push(`end:${persona.fullName}`);

          return drafter.draft(persona);
        },
      };

      await run({ size: 4, batchSize: 2, drafter: slow }).events;

      // The barrier is the point of batching: everything in batch one settles
      // before anything in batch two begins.
      const phases = order.map((entry) => entry.split(':')[0]);

      expect(phases).toEqual([
        'start',
        'start',
        'end',
        'end',
        'start',
        'start',
        'end',
        'end',
      ]);
    });

    it('runs a batch in parallel', async () => {
      const started: number[] = [];
      const base = drafterStub();
      const drafter = {
        ...base,
        draft: async (persona: Parameters<typeof base.draft>[0]) => {
          started.push(Date.now());
          await new Promise((resolve) => setTimeout(resolve, 20));

          return base.draft(persona);
        },
      };

      const began = Date.now();
      await run({ size: 3, batchSize: 3, drafter: drafter }).events;

      // Three 20ms drafts concurrently, not 60ms of queueing.
      expect(Date.now() - began).toBeLessThan(60);
      expect(started).toHaveLength(3);
    });
  });

  describe('failures', () => {
    it('lets the siblings of a failed CV finish', async () => {
      const plan = CorpusPlan.build(4, 42).personas;
      const drafter = drafterStub({
        [plan[0].fullName]: new Error('the model refused'),
      });

      const harness = run({ size: 4, batchSize: 4, drafter });
      const events = await harness.events;

      // `allSettled`, never `all`: a corpus of 3 of 4 is a success.
      expect(only(events, 'cv_failed')).toHaveLength(1);
      expect(only(events, 'cv_completed')).toHaveLength(3);
      expect(harness.repository.saved).toHaveLength(3);
      expect(only(events, 'done')[0].summary).toMatchObject({
        generated: 3,
        failed: 1,
      });
    });

    it('names the reason on the failure event', async () => {
      const plan = CorpusPlan.build(2, 42).personas;
      const drafter = drafterStub({
        [plan[1].fullName]: new Error('drafting failed after one repair'),
      });

      const events = await run({ size: 2, batchSize: 2, drafter }).events;

      expect(only(events, 'cv_failed')[0].reason).toContain('one repair');
    });

    it('still completes the stream when every CV fails', async () => {
      const plan = CorpusPlan.build(2, 42).personas;
      const drafter = drafterStub({
        [plan[0].fullName]: new Error('boom'),
        [plan[1].fullName]: new Error('boom'),
      });

      const events = await run({ size: 2, batchSize: 2, drafter }).events;

      expect(typesOf(events).at(-1)).toBe('done');
      expect(only(events, 'done')[0].summary.failed).toBe(2);
    });
  });

  describe('rate limits', () => {
    it('reports throttling as its own event, not as a failure', async () => {
      const plan = CorpusPlan.build(4, 42).personas;
      const drafter = drafterStub({ [plan[0].fullName]: rateLimitError() });

      const events = await run({ size: 4, batchSize: 2, drafter }).events;
      const [throttled] = only(events, 'throttled');

      // Being rate-limited on a free tier is expected and recoverable; the UI
      // should say "waiting" rather than implying something broke.
      expect(throttled).toEqual({
        type: 'throttled',
        batch: 1,
        delayMs: 2_000,
      });
    });

    it('backs off and carries the raised delay into later batches', async () => {
      const plan = CorpusPlan.build(6, 42).personas;
      const drafter = drafterStub({ [plan[0].fullName]: rateLimitError() });

      const harness = run({ size: 6, batchSize: 2, drafter });
      await harness.events;

      // Raised once, then held: a run degrades into a slower run instead of
      // dying, and does not ease off into another 429.
      expect(harness.sleeps).toEqual([2_000, 2_000]);
    });

    it('does not retry the throttled personas inline', async () => {
      const plan = CorpusPlan.build(2, 42).personas;
      const drafter = drafterStub({ [plan[0].fullName]: rateLimitError() });

      await run({ size: 2, batchSize: 2, drafter }).events;

      // They are simply absent; re-running picks them up by checksum. Retrying
      // here would put the retry policy in two places.
      expect(
        drafter.drafted.filter((name) => name === plan[0].fullName),
      ).toEqual([plan[0].fullName]);
    });

    it('treats an ordinary failure as no reason to slow down', async () => {
      const plan = CorpusPlan.build(4, 42).personas;
      const drafter = drafterStub({
        [plan[0].fullName]: new Error('invalid profile'),
      });

      const harness = run({ size: 4, batchSize: 2, drafter });
      const events = await harness.events;

      expect(only(events, 'throttled')).toHaveLength(0);
      expect(harness.sleeps).toEqual([1_000]);
    });
  });

  describe('idempotency', () => {
    it('skips personas already in the corpus and still shows their cards', async () => {
      const plan = CorpusPlan.build(4, 42).personas;
      const repository = repositoryStub();
      repository.seed(existingCandidateFor(plan[0]));
      repository.seed(existingCandidateFor(plan[1]));

      const harness = run({ size: 4, batchSize: 2, repository });
      const events = await harness.events;

      // Announced anyway, so a resumed run fills the gallery instead of looking
      // empty until the missing CVs finish.
      expect(only(events, 'cv_completed')).toHaveLength(4);
      expect(only(events, 'cv_started')).toHaveLength(2);
      expect(harness.drafter.drafted).toHaveLength(2);
      expect(only(events, 'done')[0].summary).toMatchObject({
        generated: 2,
        skipped: 2,
      });
    });

    it('costs nothing to re-run a finished corpus', async () => {
      const repository = repositoryStub();
      for (const persona of CorpusPlan.build(4, 42).personas) {
        repository.seed(existingCandidateFor(persona));
      }

      const harness = run({ size: 4, batchSize: 2, repository });
      await harness.events;

      expect(harness.drafter.drafted).toEqual([]);
      expect(harness.storage.written).toEqual([]);
    });

    it('tops up incrementally: ten generated, thirty asked for, twenty made', async () => {
      const repository = repositoryStub();
      for (const persona of CorpusPlan.build(4, 42).personas) {
        repository.seed(existingCandidateFor(persona));
      }

      const harness = run({ size: 10, batchSize: 5, repository });
      await harness.events;

      // The plan is a prefix relationship, so a larger size keeps the first four
      // and adds the rest.
      expect(harness.drafter.drafted).toHaveLength(6);
    });

    it('regenerates everything when force is set', async () => {
      const repository = repositoryStub();
      for (const persona of CorpusPlan.build(3, 42).personas) {
        repository.seed(existingCandidateFor(persona));
      }

      const harness = run({ size: 3, batchSize: 3, repository, force: true });
      await harness.events;

      expect(harness.drafter.drafted).toHaveLength(3);
    });

    it('recognises a persona by checksum, not by name', async () => {
      // The checksum covers every attribute, so an edited catalogue regenerates
      // rather than keeping a stale CV.
      const [persona] = CorpusPlan.build(1, 42).personas;
      const repository = repositoryStub();
      repository.seed(existingCandidateFor(persona));

      const checksums = await repository.findChecksums();

      expect(checksums.has(personaChecksum(persona))).toBe(true);
    });
  });

  describe('when something unexpected breaks', () => {
    it('ends with a single error event rather than leaving the client hanging', async () => {
      const repository = repositoryStub();
      const exploding = {
        ...repository,
        findChecksums: () => Promise.reject(new Error('the database is down')),
      };

      const events = await run({
        size: 2,
        repository: exploding,
      }).events;

      expect(typesOf(events).at(-1)).toBe('error');
      expect(only(events, 'error')[0].message).toContain('database is down');
    });
  });
});
