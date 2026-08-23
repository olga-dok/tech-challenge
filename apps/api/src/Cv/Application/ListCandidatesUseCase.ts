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
 * Paginated browsing, or — when `slugs` is given — an ordered ranked subset.
 */
export class ListCandidatesUseCase {
  constructor(private readonly repository: CvRepository) {}

  async execute(request: ListCandidatesRequest): Promise<ListCandidatesResult> {
    if (request.slugs !== undefined) {
      return this.executeOrdered(request.slugs, request.page, request.pageSize);
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
    page: number,
    pageSize: number,
  ): Promise<ListCandidatesResult> {
    const found = await this.repository.findBySlugs(slugs);
    const bySlug = new Map(
      found.map((candidate) => [candidate.slug.value, candidate]),
    );
    const items = slugs
      .map((slug) => bySlug.get(slug.value))
      .filter((candidate): candidate is Candidate => candidate !== undefined);

    const total = items.length;
    const start = Math.max(0, (page - 1) * pageSize);
    const pagedItems = items.slice(start, start + pageSize);

    return {
      items: pagedItems,
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }
}
