import { sampleProfile } from '@repo/cv-templates';
import { GetCorpusStatsUseCase } from '../../../../src/Cv/Application/GetCorpusStatsUseCase';
import { Candidate } from '../../../../src/Cv/Domain/Candidate';
import type { EmbeddedCvChunk } from '../../../../src/Cv/Domain/CvChunk';
import { Slug } from '../../../../src/Cv/Domain/Slug';
import { repositoryStub } from '../../../support/generationDoubles';

const candidateFor = (name: string): Candidate =>
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

const chunk = (ordinal: number): EmbeddedCvChunk => ({
  section: 'SUMMARY',
  ordinal,
  content: 'text',
  tokenCount: 10,
  embedding: [0.1],
});

describe('GetCorpusStatsUseCase', () => {
  it('reports zero candidates without dividing by zero', async () => {
    const useCase = new GetCorpusStatsUseCase(repositoryStub());

    const stats = await useCase.execute();

    expect(stats).toEqual({
      candidates: 0,
      chunks: 0,
      avgChunksPerCandidate: 0,
      lastIngestedAt: null,
      isIngested: false,
    });
  });

  it('computes avgChunksPerCandidate and isIngested once candidates are ingested', async () => {
    const repository = repositoryStub();
    repository.seed(candidateFor('ana'));
    repository.seed(candidateFor('bo'));

    await repository.replaceChunks('id-ana', 'hash-ana', [chunk(0), chunk(1)]);
    await repository.replaceChunks('id-bo', 'hash-bo', [chunk(0)]);

    const useCase = new GetCorpusStatsUseCase(repository);
    const stats = await useCase.execute();

    expect(stats.candidates).toBe(2);
    expect(stats.chunks).toBe(3);
    expect(stats.avgChunksPerCandidate).toBe(1.5);
    expect(stats.isIngested).toBe(true);
    expect(stats.lastIngestedAt).not.toBeNull();
  });

  it('is not ingested when candidates exist but have no chunks', async () => {
    const repository = repositoryStub();
    repository.seed(candidateFor('ana'));

    const useCase = new GetCorpusStatsUseCase(repository);
    const stats = await useCase.execute();

    expect(stats.isIngested).toBe(false);
  });
});
