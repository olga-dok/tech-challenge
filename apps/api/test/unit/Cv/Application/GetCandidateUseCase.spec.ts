import { sampleProfile } from '@repo/cv-templates';
import { GetCandidateUseCase } from '../../../../src/Cv/Application/GetCandidateUseCase';
import { Candidate } from '../../../../src/Cv/Domain/Candidate';
import { CandidateNotFoundError } from '../../../../src/Cv/Domain/CandidateNotFoundError';
import { Slug } from '../../../../src/Cv/Domain/Slug';
import { caughtRejection } from '../../../support/caughtError';
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

describe('GetCandidateUseCase', () => {
  it('returns the candidate for a known slug', async () => {
    const repository = repositoryStub();
    repository.seed(candidateFor('ana-ruiz'));
    const useCase = new GetCandidateUseCase(repository);

    const candidate = await useCase.execute(Slug.fromName('ana-ruiz'));

    expect(candidate.fullName).toBe('ana-ruiz');
  });

  it('throws CandidateNotFoundError for an unknown slug', async () => {
    const useCase = new GetCandidateUseCase(repositoryStub());

    const error = await caughtRejection(() =>
      useCase.execute(Slug.from('nobody-here')),
    );

    expect(error).toBeInstanceOf(CandidateNotFoundError);
  });
});
