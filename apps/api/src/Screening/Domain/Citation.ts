import type { CvSection } from '@repo/contracts';
import type { Slug } from '../../Cv/Domain/Slug';

/**
 * A chunk worth citing, once fusion and diversification have settled on it.
 * `snippet` is the chunk's content verbatim — chunks are already
 * identity-header-prefixed and capped at 400 tokens, so no further
 * truncation is needed.
 */
export interface Citation {
  readonly candidateId: string;
  readonly candidateName: string;
  readonly slug: Slug;
  readonly section: CvSection;
  readonly ordinal: number;
  readonly snippet: string;
  /** The fused score, not any single arm's — what decided this chunk's place. */
  readonly score: number;
}
