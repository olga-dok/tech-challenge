import type { RoleFamily, Seniority } from '@repo/contracts';
import type { Slug } from '../Domain/Slug';

export interface ListCandidatesRequest {
  readonly page: number;
  readonly pageSize: number;
  readonly roleFamily?: RoleFamily;
  readonly seniority?: Seniority;
  readonly skill?: string;
  /**
   * When set, returns these candidates in this order, while still applying
   * page/pageSize over that ordered subset.
   */
  readonly slugs?: readonly Slug[];
}
