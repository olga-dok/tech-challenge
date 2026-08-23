import type { RoleFamily, Seniority } from '@repo/contracts';
import type { Candidate } from './Candidate';
import type { EmbeddedCvChunk } from './CvChunk';
import type { Slug } from './Slug';

export interface CandidatePageCriteria {
  readonly page: number;
  readonly pageSize: number;
  readonly roleFamily?: RoleFamily;
  readonly seniority?: Seniority;
  readonly skill?: string;
}

export interface CorpusStats {
  readonly candidates: number;
  readonly chunks: number;
  readonly lastIngestedAt: Date | null;
}

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
  /** A filtered, paginated slice of the corpus, for the gallery to browse. */
  findPage(
    criteria: CandidatePageCriteria,
  ): Promise<{ items: Candidate[]; total: number }>;
  /**
   * Set membership only — ordering an arbitrary input list of slugs is a
   * presentation concern the caller owns, not something persistence should do.
   */
  findBySlugs(slugs: readonly Slug[]): Promise<Candidate[]>;
  corpusStats(): Promise<CorpusStats>;
}

export const CvRepositoryId = Symbol('CvRepository');
