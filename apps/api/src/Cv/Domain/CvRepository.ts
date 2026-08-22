import type { Candidate } from './Candidate';
import type { Slug } from './Slug';

/**
 * Persistence for generated candidates, in terms the domain cares about.
 *
 * `findChecksums` exists for one reason: idempotency. A run starts by asking
 * which personas are already present, so re-clicking Generate resumes instead of
 * duplicating, and a fully generated corpus finishes in seconds.
 */
export interface CvRepository {
  findChecksums(): Promise<Set<string>>;
  findBySlug(slug: Slug): Promise<Candidate | null>;
  findByChecksum(checksum: string): Promise<Candidate | null>;
  /** Insert or replace by slug, so regenerating a candidate is not a conflict. */
  save(candidate: Candidate): Promise<Candidate>;
  countAll(): Promise<number>;
}

export const CvRepositoryId = Symbol('CvRepository');
