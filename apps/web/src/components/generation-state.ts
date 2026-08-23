import type { CandidateSummary } from "../domain/corpus/corpus-summary";

export interface GenerationState {
  readonly status: "idle" | "running" | "throttled";
  readonly total: number | null;
  readonly completed: number;
  readonly currentBatch: number | null;
  readonly totalBatches: number | null;
  readonly throttleDelayMs: number | null;
  readonly failedCount: number;
  readonly streamedCandidates: readonly CandidateSummary[];
  /** A stream that ended (via `done` or a dropped connection) without every planned CV succeeding. */
  readonly endedWithGaps: boolean;
}

export const IDLE_GENERATION_STATE: GenerationState = {
  status: "idle",
  total: null,
  completed: 0,
  currentBatch: null,
  totalBatches: null,
  throttleDelayMs: null,
  failedCount: 0,
  streamedCandidates: [],
  endedWithGaps: false,
};
