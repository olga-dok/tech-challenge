import { createHash } from 'node:crypto';
import { sampleProfile } from '@repo/cv-templates';
import { Candidate } from '../../../../src/Cv/Domain/Candidate';
import type { Embedder } from '../../../../src/Cv/Domain/Embedder';
import { EmbeddingFailedError } from '../../../../src/Cv/Domain/EmbeddingFailedError';
import { Slug } from '../../../../src/Cv/Domain/Slug';
import type {
  TextExtractionResult,
  TextExtractor,
} from '../../../../src/Cv/Domain/TextExtractor';
import { CvIngester } from '../../../../src/Cv/Application/CvIngester';
import { caughtError } from '../../../support/caughtError';
import { repositoryStub } from '../../../support/generationDoubles';

const RAW_TEXT = `Ana Ruiz

Summary
Fintech backend engineer.

Experience
Senior Backend Engineer, Nimbus
Mar 2021 - Present
Led the platform migration.`;

const sha256 = (text: string): string =>
  createHash('sha256').update(text, 'utf8').digest('hex');

const extractorStub = (
  result: TextExtractionResult = {
    succeeded: true,
    document: { pages: [RAW_TEXT], rawText: RAW_TEXT },
  },
): TextExtractor => ({
  extract: () => Promise.resolve(result),
});

const embedderStub = (dimensions = 4): Embedder => ({
  dimensions,
  embed: (texts) =>
    Promise.resolve(
      texts.map(() => Array.from({ length: dimensions }, () => 0.1)),
    ),
  embedQuery: () =>
    Promise.resolve(Array.from({ length: dimensions }, () => 0.1)),
});

const candidateWith = (contentHash: string | null): Candidate =>
  Candidate.fromAttributes({
    id: 'candidate-1',
    slug: Slug.from('ana-ruiz'),
    profile: { ...sampleProfile(), fullName: 'Ana Ruiz' },
    persona: {
      country: 'Spain',
      roleFamily: 'BACKEND',
      seniority: 'SENIOR',
      yearsExperience: 11,
    },
    files: {
      pdfPath: 'cvs/ana-ruiz.pdf',
      portraitPath: 'portraits/ana-ruiz.jpg',
    },
    templateId: 'classic',
    sourceChecksum: 'checksum-1',
    createdAt: new Date(0),
    ingestedAt: null,
    contentHash,
  });

describe('CvIngester', () => {
  it('extracts, chunks, embeds, and persists a fresh candidate', async () => {
    const repository = repositoryStub();
    const ingester = new CvIngester(
      extractorStub(),
      embedderStub(),
      repository,
      '/storage',
      4,
    );

    const outcome = await ingester.ingestOne(candidateWith(null), false);

    expect(outcome.status).toBe('ingested');
    expect(outcome.chunks).toBeGreaterThan(0);
    expect(repository.replaceChunksCalls).toHaveLength(1);

    const call = repository.replaceChunksCalls[0];
    expect(call.candidateId).toBe('candidate-1');
    expect(call.contentHash).toBe(sha256(RAW_TEXT));
    expect(call.chunks).toHaveLength(outcome.chunks);
    for (const chunk of call.chunks) {
      expect(chunk.embedding).toHaveLength(4);
    }
  });

  it('skips re-embedding when the content hash is unchanged', async () => {
    const repository = repositoryStub();
    const ingester = new CvIngester(
      extractorStub(),
      embedderStub(),
      repository,
      '/storage',
      4,
    );

    const outcome = await ingester.ingestOne(
      candidateWith(sha256(RAW_TEXT)),
      false,
    );

    expect(outcome).toEqual({ status: 'skipped', chunks: 0 });
    expect(repository.replaceChunksCalls).toHaveLength(0);
  });

  it('re-embeds an unchanged candidate when force is set', async () => {
    const repository = repositoryStub();
    const ingester = new CvIngester(
      extractorStub(),
      embedderStub(),
      repository,
      '/storage',
      4,
    );

    const outcome = await ingester.ingestOne(
      candidateWith(sha256(RAW_TEXT)),
      true,
    );

    expect(outcome.status).toBe('ingested');
    expect(repository.replaceChunksCalls).toHaveLength(1);
  });

  it('reports a failed extraction as an outcome rather than throwing', async () => {
    const repository = repositoryStub();
    const ingester = new CvIngester(
      extractorStub({
        succeeded: false,
        failure: { reason: 'parse-failed', detail: 'boom' },
      }),
      embedderStub(),
      repository,
      '/storage',
      4,
    );

    const outcome = await ingester.ingestOne(candidateWith(null), false);

    expect(outcome).toEqual({ status: 'failed', chunks: 0, reason: 'boom' });
    expect(repository.replaceChunksCalls).toHaveLength(0);
  });

  it('fails at construction when the embedder does not match the schema width', () => {
    const error = caughtError(
      () =>
        new CvIngester(
          extractorStub(),
          embedderStub(999),
          repositoryStub(),
          '/storage',
          384,
        ),
    );

    expect(error).toBeInstanceOf(EmbeddingFailedError);
  });
});
