import type { CvSection } from '@repo/contracts';

/**
 * What the chunker produces and Step 10 persists. Deliberately missing id,
 * candidateId and embedding — those are storage concerns the repository adds,
 * not something a pure text-splitting function should know about.
 */
export interface CvChunk {
  readonly section: CvSection;
  readonly ordinal: number;
  /** Includes the identity-header prefix — this is what gets embedded verbatim. */
  readonly content: string;
  readonly tokenCount: number;
}

/** A chunk plus the vector the embedder produced for its content — what the repository persists. */
export interface EmbeddedCvChunk extends CvChunk {
  readonly embedding: readonly number[];
}
