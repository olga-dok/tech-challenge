import { z } from 'zod';
import { CandidateSummarySchema } from './candidate';

/**
 * The generation protocol. Thirty CVs takes minutes on a free tier, so the
 * pipeline reports progress as it goes instead of returning a summary at the
 * end — the gallery fills in card by card and there is always something on
 * screen.
 */

export const GenerationSummarySchema = z.object({
  generated: z.number().int().min(0),
  failed: z.number().int().min(0),
  skipped: z.number().int().min(0),
  chunks: z.number().int().min(0),
  durationMs: z.number().int().min(0),
});
export type GenerationSummary = z.infer<typeof GenerationSummarySchema>;

export const GenerationStreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('plan'),
    total: z.number().int().min(0),
    batches: z.number().int().min(0),
    batchSize: z.number().int().min(1),
  }),
  z.object({
    type: z.literal('batch_started'),
    batch: z.number().int().min(1),
    of: z.number().int().min(1),
    size: z.number().int().min(1),
  }),
  z.object({
    type: z.literal('cv_started'),
    index: z.number().int().min(0),
    /** Human-readable persona, e.g. "Senior data engineer · Barcelona" — the UI has no personas of its own. */
    personaLabel: z.string().min(1),
  }),
  z.object({
    type: z.literal('cv_completed'),
    index: z.number().int().min(0),
    // The finished card rides along, so the gallery can append immediately
    // instead of refetching a page per CV.
    candidate: CandidateSummarySchema,
  }),
  z.object({
    type: z.literal('cv_failed'),
    index: z.number().int().min(0),
    reason: z.string().min(1),
  }),
  z.object({
    type: z.literal('batch_completed'),
    batch: z.number().int().min(1),
    of: z.number().int().min(1),
    generated: z.number().int().min(0),
    failed: z.number().int().min(0),
    skipped: z.number().int().min(0),
    /** Pacing before the next batch, so the UI can count down instead of looking stalled. */
    nextDelayMs: z.number().int().min(0),
  }),
  // Distinct from `cv_failed` on purpose: being rate-limited on a free tier is
  // expected and recoverable, so the UI can say "waiting out a rate limit"
  // rather than implying something broke.
  z.object({
    type: z.literal('throttled'),
    batch: z.number().int().min(1),
    delayMs: z.number().int().min(0),
  }),
  z.object({ type: z.literal('ingest_started') }),
  z.object({
    type: z.literal('ingest_progress'),
    done: z.number().int().min(0),
    total: z.number().int().min(0),
  }),
  z.object({
    type: z.literal('done'),
    summary: GenerationSummarySchema,
  }),
  z.object({ type: z.literal('error'), message: z.string().min(1) }),
]);
export type GenerationStreamEvent = z.infer<typeof GenerationStreamEventSchema>;

/** `GenerationEvent<'cv_completed'>` — the single member, without re-declaring its fields. */
export type GenerationEvent<TType extends GenerationStreamEvent['type']> =
  Extract<GenerationStreamEvent, { type: TType }>;

/**
 * Callbacks take the whole event rather than positional arguments: these carry
 * four to six fields each and gain more as the pipeline learns to report
 * itself, and a six-argument callback is unreadable at both ends.
 */
export interface GenerationStreamCallbacks {
  onPlan?: (event: GenerationEvent<'plan'>) => void;
  onBatchStarted?: (event: GenerationEvent<'batch_started'>) => void;
  onCvStarted?: (event: GenerationEvent<'cv_started'>) => void;
  onCvCompleted?: (event: GenerationEvent<'cv_completed'>) => void;
  onCvFailed?: (event: GenerationEvent<'cv_failed'>) => void;
  onBatchCompleted?: (event: GenerationEvent<'batch_completed'>) => void;
  onThrottled?: (event: GenerationEvent<'throttled'>) => void;
  onIngestStarted?: () => void;
  onIngestProgress?: (event: GenerationEvent<'ingest_progress'>) => void;
  onDone?: (summary: GenerationSummary) => void;
  onError?: (message: string) => void;
}
