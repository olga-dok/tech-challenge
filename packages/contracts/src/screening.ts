import { z } from 'zod';
import { CvSectionSchema } from './enums';
import { ScoreSchema, SlugSchema } from './primitives';

/**
 * A candidate the answer rests on, in the order the gallery should show them.
 * `rank` is sent explicitly rather than inferred from array position: the chat
 * renders "#2" on a card that may arrive out of order, and an off-by-one there
 * is a lie about the ranking.
 */
export const RankedCandidateSchema = z.object({
  slug: SlugSchema,
  rank: z.number().int().min(1),
  score: ScoreSchema,
  /** One line for the card badge — the matching section plus a few words of why. */
  reason: z.string().min(1).max(160),
});
export type RankedCandidate = z.infer<typeof RankedCandidateSchema>;

/** A chunk the answer actually drew on, addressable back to its section of the PDF. */
export const CitationSchema = z.object({
  candidateId: z.uuid(),
  candidateName: z.string().min(2),
  slug: SlugSchema,
  section: CvSectionSchema,
  ordinal: z.number().int().min(0),
  snippet: z.string().min(1),
  score: ScoreSchema,
});
export type Citation = z.infer<typeof CitationSchema>;

export const ScreeningModeSchema = z.enum(['grounded', 'agentic']);
export type ScreeningMode = z.infer<typeof ScreeningModeSchema>;

export const AskQuestionRequestSchema = z.object({
  // 500 characters is a question, not a pasted job description. The ceiling also
  // bounds what reaches the LLM, which matters on a free tier.
  question: z.string().trim().min(1).max(500),
  conversationId: z.uuid().optional(),
  mode: ScreeningModeSchema.default('grounded'),
});
export type AskQuestionRequestDto = z.infer<typeof AskQuestionRequestSchema>;
