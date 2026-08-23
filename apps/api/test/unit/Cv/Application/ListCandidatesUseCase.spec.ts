import type { RoleFamily, Seniority } from '@repo/contracts';
import { sampleProfile } from '@repo/cv-templates';
import { ListCandidatesUseCase } from '../../../../src/Cv/Application/ListCandidatesUseCase';
import { Candidate } from '../../../../src/Cv/Domain/Candidate';
import { Slug } from '../../../../src/Cv/Domain/Slug';
import { repositoryStub } from '../../../support/generationDoubles';

const candidateFor = (
  name: string,
  overrides: {
    roleFamily?: RoleFamily;
    seniority?: Seniority;
    skills?: string[];
  } = {},
): Candidate =>
  Candidate.fromAttributes({
    id: `id-${name}`,
    slug: Slug.fromName(name),
    profile: {
      ...sampleProfile(),
      fullName: name,
      skills: overrides.skills ?? sampleProfile().skills,
    },
    persona: {
      country: 'Spain',
      roleFamily: overrides.roleFamily ?? 'BACKEND',
      seniority: overrides.seniority ?? 'SENIOR',
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

describe('ListCandidatesUseCase', () => {
  it('paginates and computes totalPages, including a partial last page', async () => {
    const repository = repositoryStub();
    for (const name of ['a', 'b', 'c', 'd', 'e']) {
      repository.seed(candidateFor(name));
    }
    const useCase = new ListCandidatesUseCase(repository);

    const firstPage = await useCase.execute({ page: 1, pageSize: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.total).toBe(5);
    expect(firstPage.totalPages).toBe(3);

    const lastPage = await useCase.execute({ page: 3, pageSize: 2 });
    expect(lastPage.items).toHaveLength(1);
  });

  it('filters by roleFamily, seniority, and skill', async () => {
    const repository = repositoryStub();
    repository.seed(
      candidateFor('backend-senior', {
        roleFamily: 'BACKEND',
        seniority: 'SENIOR',
        skills: ['Python'],
      }),
    );
    repository.seed(
      candidateFor('frontend-junior', {
        roleFamily: 'FRONTEND',
        seniority: 'JUNIOR',
        skills: ['React'],
      }),
    );
    const useCase = new ListCandidatesUseCase(repository);

    const byRole = await useCase.execute({
      page: 1,
      pageSize: 10,
      roleFamily: 'BACKEND',
    });
    expect(byRole.items.map((c) => c.fullName)).toEqual(['backend-senior']);

    const bySkill = await useCase.execute({
      page: 1,
      pageSize: 10,
      skill: 'React',
    });
    expect(bySkill.items.map((c) => c.fullName)).toEqual(['frontend-junior']);
  });

  it('returns exactly the given slugs in the given order, bypassing pagination', async () => {
    const repository = repositoryStub();
    repository.seed(candidateFor('ana'));
    repository.seed(candidateFor('bo'));
    repository.seed(candidateFor('cy'));
    const useCase = new ListCandidatesUseCase(repository);

    const result = await useCase.execute({
      page: 1,
      pageSize: 12,
      slugs: [Slug.fromName('cy'), Slug.fromName('ana')],
    });

    expect(result.items.map((c) => c.fullName)).toEqual(['cy', 'ana']);
    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(1);
  });
});
