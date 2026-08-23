import type { Slug } from '../../Cv/Domain/Slug';

/** A candidate the retrieved chunks rest on, aggregated for the gallery ranking. */
export interface RankedCandidate {
  readonly slug: Slug;
  readonly rank: number;
  readonly score: number;
  /** Deterministic, not LLM-written — the section of this candidate's best-scoring chunk. */
  readonly reason: string;
}
