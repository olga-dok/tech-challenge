import type { Persona } from './Persona';

export interface BatchPacing {
  readonly batchDelayMs: number;
  readonly batchBackoffFactor: number;
  readonly maxBatchDelayMs: number;
}

/**
 * Splits the plan into the batches a run will execute.
 *
 * A batch runs in parallel, every member settles, the pipeline pauses, then the
 * next batch starts. Batch size is deliberately the *only* parallelism dial: a
 * separate concurrency setting would overlap with it and make neither
 * predictable.
 *
 * The cost is a barrier — one slow CV stalls the rest of its batch, where a
 * rolling window would backfill. At thirty CVs that trade is worth taking:
 * pacing between batches is what respects a per-minute quota (a concurrency cap
 * does nothing about it), each batch is a checkpoint, and "batch 3 of 6" is
 * legible progress. Squeezing wall-clock is not the constraint; not being cut
 * off mid-demo is.
 */
export function intoBatches(
  personas: readonly Persona[],
  batchSize: number,
): Persona[][] {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new TypeError(
      `A batch size must be a whole number of at least 1, got ${String(batchSize)}`,
    );
  }

  const batches: Persona[][] = [];

  for (let start = 0; start < personas.length; start += batchSize) {
    batches.push(personas.slice(start, start + batchSize));
  }

  return batches;
}

/**
 * The delay before the next batch.
 *
 * A throttled batch multiplies the wait for those that follow and the raised
 * delay is carried forward, so a run that hits a quota degrades into a slower
 * run instead of dying. It never recovers downward on purpose: once a free tier
 * has started refusing, easing off again just earns another 429.
 */
export function nextBatchDelay(
  currentDelayMs: number,
  wasThrottled: boolean,
  pacing: BatchPacing,
): number {
  const base = Math.max(currentDelayMs, pacing.batchDelayMs);

  if (!wasThrottled) {
    return Math.min(base, pacing.maxBatchDelayMs);
  }

  // A first throttle at a zero base delay still has to produce a real pause,
  // hence the floor of one second before multiplying.
  const raised = Math.max(base, 1_000) * pacing.batchBackoffFactor;

  return Math.min(Math.round(raised), pacing.maxBatchDelayMs);
}
