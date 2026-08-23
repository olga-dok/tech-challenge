import type { Candidate } from './Candidate';
import type { EmbeddedCvChunk } from './CvChunk';
import type { Slug } from './Slug';

/**
 * Persistence for generated candidates, in terms the domain cares about.
 *
 * `findChecksums` exists for one reason: idempotency. A run starts by asking
 * which personas are already present, so re-clicking Generate resumes instead of
 * duplicating, and a fully generated corpus finishes in seconds.
 *
 * Chunks live on this port too, not a separate repository — they are a child of
 * the `Candidate` aggregate, same as the PDF/portrait paths `save` already owns.
 */
export interface CvRepository {
  findChecksums(): Promise<Set<string>>;
  findBySlug(slug: Slug): Promise<Candidate | null>;
  findByChecksum(checksum: string): Promise<Candidate | null>;
  /** Insert or replace by slug, so regenerating a candidate is not a conflict. */
  save(candidate: Candidate): Promise<Candidate>;
  countAll(): Promise<number>;
  /** Every stored candidate — what ingestion iterates over. */
  findAll(): Promise<Candidate[]>;
  /**
   * Replaces a candidate's whole chunk set and stamps `contentHash`/`ingestedAt`
   * in one transaction, so a partial embedding failure can never leave a
   * candidate half-indexed — the old chunks stay in place until the new ones are
   * committed.
   */
  replaceChunks(
    candidateId: string,
    contentHash: string,
    chunks: readonly EmbeddedCvChunk[],
  ): Promise<void>;
}

export const CvRepositoryId = Symbol('CvRepository');
