import type { GenerationStreamEvent } from '@repo/contracts';
import { sampleProfile } from '@repo/cv-templates';
import { lastValueFrom, toArray } from 'rxjs';
import { CvIngester } from '../../../../src/Cv/Application/CvIngester';
import { IngestCvCorpusUseCase } from '../../../../src/Cv/Application/IngestCvCorpusUseCase';
import { Candidate } from '../../../../src/Cv/Domain/Candidate';
import type { Embedder } from '../../../../src/Cv/Domain/Embedder';
import { Slug } from '../../../../src/Cv/Domain/Slug';
import type {
  TextExtractionResult,
  TextExtractor,
} from '../../../../src/Cv/Domain/TextExtractor';
import {
  repositoryStub,
  type RepositoryStub,
} from '../../../support/generationDoubles';

const rawTextFor = (name: string): string => `${name}\n\nSummary\nA candidate.`;

const candidateNamed = (name: string): Candidate =>
  Candidate.fromAttributes({
    id: `id-${name}`,
    slug: Slug.fromName(name),
    profile: { ...sampleProfile(), fullName: name },
    persona: {
      country: 'Spain',
      roleFamily: 'BACKEND',
      seniority: 'SENIOR',
      yearsExperience: 5,
    },
    files: {
      pdfPath: `cvs/${Slug.fromName(name).value}.pdf`,
      portraitPath: `portraits/${Slug.fromName(name).value}.jpg`,
    },
    templateId: 'classic',
    sourceChecksum: `checksum-${name}`,
    createdAt: new Date(0),
    ingestedAt: null,
    contentHash: null,
  });

const embedderStub = (): Embedder => ({
  dimensions: 4,
  embed: (texts) => Promise.resolve(texts.map(() => [0.1, 0.2, 0.3, 0.4])),
  embedQuery: () => Promise.resolve([0.1, 0.2, 0.3, 0.4]),
});

/** Extracts every candidate successfully, unless its name is in `failing`. */
const extractorStub = (failing: readonly string[] = []): TextExtractor => ({
  extract: (pdfPath: string): Promise<TextExtractionResult> => {
    const name = pdfPath.split('/').pop()?.replace('.pdf', '') ?? '';

    if (failing.some((failingName) => pdfPath.includes(failingName))) {
      return Promise.resolve({
        succeeded: false,
        failure: { reason: 'parse-failed', detail: `broken PDF for ${name}` },
      });
    }

    const rawText = rawTextFor(name);

    return Promise.resolve({
      succeeded: true,
      document: { pages: [rawText], rawText },
    });
  },
});

const runIngest = async (
  repository: RepositoryStub,
  options: { failing?: readonly string[]; force?: boolean } = {},
): Promise<GenerationStreamEvent[]> => {
  const ingester = new CvIngester(
    extractorStub(options.failing),
    embedderStub(),
    repository,
    '/storage',
    4,
  );
  const useCase = new IngestCvCorpusUseCase(repository, ingester, {
    concurrency: 2,
  });

  return lastValueFrom(
    useCase.ingest({ force: options.force }).pipe(toArray()),
  );
};

describe('IngestCvCorpusUseCase', () => {
  it('emits ingest_started, one ingest_progress per candidate, then done', async () => {
    const repository = repositoryStub();
    repository.seed(candidateNamed('ana-ruiz'));
    repository.seed(candidateNamed('jon-doe'));

    const events = await runIngest(repository);

    expect(events[0]).toEqual({ type: 'ingest_started' });
    expect(
      events.filter((event) => event.type === 'ingest_progress'),
    ).toHaveLength(2);
    expect(events.at(-1)?.type).toBe('done');

    const progressEvents = events.filter(
      (event) => event.type === 'ingest_progress',
    );
    expect(progressEvents.map((event) => event.done)).toEqual([1, 2]);
    expect(progressEvents.every((event) => event.total === 2)).toBe(true);
  });

  it('tallies ingested candidates and their chunks in the final summary', async () => {
    const repository = repositoryStub();
    repository.seed(candidateNamed('ana-ruiz'));
    repository.seed(candidateNamed('jon-doe'));

    const events = await runIngest(repository);
    const done = events.at(-1);

    if (done?.type !== 'done') {
      throw new Error('expected a done event');
    }

    expect(done.summary.generated).toBe(2);
    expect(done.summary.failed).toBe(0);
    expect(done.summary.skipped).toBe(0);
    expect(done.summary.chunks).toBeGreaterThan(0);
  });

  it('isolates a failing candidate: the rest still ingest', async () => {
    const repository = repositoryStub();
    repository.seed(candidateNamed('ana-ruiz'));
    repository.seed(candidateNamed('broken-one'));
    repository.seed(candidateNamed('jon-doe'));

    const events = await runIngest(repository, { failing: ['broken-one'] });
    const done = events.at(-1);

    if (done?.type !== 'done') {
      throw new Error('expected a done event');
    }

    expect(done.summary.generated).toBe(2);
    expect(done.summary.failed).toBe(1);
    expect(
      events.filter((event) => event.type === 'ingest_progress'),
    ).toHaveLength(3);
  });

  it('reports candidates already ingested with an unchanged hash as skipped', async () => {
    const repository = repositoryStub();
    const seeded = candidateNamed('ana-ruiz');
    repository.seed(seeded);
    // Pre-ingest once, so the second run sees a matching content hash.
    await runIngest(repository);

    const events = await runIngest(repository);
    const done = events.at(-1);

    if (done?.type !== 'done') {
      throw new Error('expected a done event');
    }

    expect(done.summary.skipped).toBe(1);
    expect(done.summary.generated).toBe(0);
  });
});
