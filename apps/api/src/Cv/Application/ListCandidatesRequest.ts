import type { RoleFamily, Seniority } from '@repo/contracts';
import type { Slug } from '../Domain/Slug';

export interface ListCandidatesRequest {
  readonly page: number;
  readonly pageSize: number;
  readonly roleFamily?: RoleFamily;
  readonly seniority?: Seniority;
  readonly skill?: string;
  /**
   * When set, returns exactly these candidates in this order and ignores
   * pagination/filters entirely — this is how a chat ranking will drive the
   * gallery without the frontend holding the whole corpus in memory.
   */
  readonly slugs?: readonly Slug[];
}
