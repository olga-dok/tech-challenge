import type { CvSection } from '@repo/contracts';
import type { Slug } from '../../Cv/Domain/Slug';

/**
 * One arm's raw hit, before fusion. Carries the real `CvChunk.id` (the Step
 * 9/10 domain `CvChunk` has none — it is pre-persistence) because RRF and
 * cross-arm dedup both need a stable key.
 */
export interface RetrievedChunk {
  readonly id: string;
  readonly candidateId: string;
  readonly candidateName: string;
  readonly slug: Slug;
  readonly section: CvSection;
  readonly ordinal: number;
  readonly content: string;
  /** This arm's own score — cosine similarity, `ts_rank`, or trigram similarity. Not comparable across arms. */
  readonly score: number;
}
