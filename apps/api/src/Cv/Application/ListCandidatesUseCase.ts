import type { Candidate } from '../Domain/Candidate';
import type { CvRepository } from '../Domain/CvRepository';
import type { Slug } from '../Domain/Slug';
import type { ListCandidatesRequest } from './ListCandidatesRequest';

export interface ListCandidatesResult {
  readonly items: Candidate[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

/**
 * Paginated browsing, or — when `slugs` is given — an exact ranked list. The
 * two are mutually exclusive on purpose: a chat ranking is a small, ordered
 * set the gallery must show verbatim, not a filter to page through.
 */
export class ListCandidatesUseCase {
  constructor(private readonly repository: CvRepository) {}

  async execute(request: ListCandidatesRequest): Promise<ListCandidatesResult> {
    if (request.slugs !== undefined) {
      return this.executeOrdered(request.slugs);
    }

    const { items, total } = await this.repository.findPage({
      page: request.page,
      pageSize: request.pageSize,
      roleFamily: request.roleFamily,
      seniority: request.seniority,
      skill: request.skill,
    });

    return {
      items,
      page: request.page,
      pageSize: request.pageSize,
      total,
      totalPages: Math.ceil(total / request.pageSize),
    };
  }

  private async executeOrdered(
    slugs: readonly Slug[],
  ): Promise<ListCandidatesResult> {
    const found = await this.repository.findBySlugs(slugs);
    const bySlug = new Map(
      found.map((candidate) => [candidate.slug.value, candidate]),
    );
    const items = slugs
      .map((slug) => bySlug.get(slug.value))
      .filter((candidate): candidate is Candidate => candidate !== undefined);

    return {
      items,
      page: 1,
      pageSize: items.length,
      total: items.length,
      totalPages: items.length === 0 ? 0 : 1,
    };
  }
}
