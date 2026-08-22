import { z } from 'zod';
import {
  CitationSchema,
  RankedCandidateSchema,
  type Citation,
  type RankedCandidate,
} from './screening';

/** Coarse enough that the UI can label it without guessing what the backend is doing. */
export const ScreeningStageSchema = z.enum(['retrieving', 'answering']);
export type ScreeningStage = z.infer<typeof ScreeningStageSchema>;

export const ScreeningStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('status'), stage: ScreeningStageSchema }),
  // `ranking` rides on the retrieval event instead of arriving with the finished
  // answer because the gallery must reorder the moment retrieval lands — while
  // the text is still streaming. That simultaneity is the product: the chat is
  // the query language for the gallery, and a ranking delivered at `done` would
  // make it a search box with a delayed side effect.
  z.object({
    type: z.literal('retrieval'),
    citations: z.array(CitationSchema),
    ranking: z.array(RankedCandidateSchema),
  }),
  z.object({ type: z.literal('token'), data: z.string() }),
  z.object({ type: z.literal('tool_start'), toolName: z.string().min(1) }),
  z.object({
    type: z.literal('tool_result'),
    toolName: z.string().min(1),
    summary: z.string(),
  }),
  // Separate from `done` so the UI can settle the bubble (stop the caret, enable
  // the composer) before the stream closes.
  z.object({ type: z.literal('answer_ended') }),
  z.object({ type: z.literal('done') }),
  z.object({ type: z.literal('error'), message: z.string().min(1) }),
]);
export type ScreeningStreamEvent = z.infer<typeof ScreeningStreamEventSchema>;

/** `ScreeningEvent<'retrieval'>` — the single member, without re-declaring its fields. */
export type ScreeningEvent<TType extends ScreeningStreamEvent['type']> =
  Extract<ScreeningStreamEvent, { type: TType }>;

export interface ScreeningStreamCallbacks {
  onStatus?: (stage: ScreeningStage) => void;
  onRetrieval?: (
    citations: readonly Citation[],
    ranking: readonly RankedCandidate[],
  ) => void;
  onToken?: (data: string) => void;
  onToolStart?: (toolName: string) => void;
  onToolResult?: (toolName: string, summary: string) => void;
  onAnswerEnded?: () => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}
