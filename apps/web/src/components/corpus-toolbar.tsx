"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui";
import type { GenerationState } from "./generation-state";
import { UI_LABELS, type UiLanguage } from "./ui-language";

/**
 * Ticks down to zero over `delayMs`, restarting whenever a new `delayMs`
 * arrives. `Date.now()` only ever runs inside the effect (render must stay
 * pure), and `setRemainingSeconds` is only ever called from the interval's
 * own callback, never synchronously in the effect body — the shape the
 * "don't setState synchronously in an effect" rule asks for.
 */
function useCountdownSeconds(delayMs: number | null): number {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    delayMs === null ? 0 : Math.ceil(delayMs / 1000),
  );

  useEffect(() => {
    if (delayMs === null) {
      return;
    }

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      setRemainingSeconds(Math.max(0, Math.ceil((delayMs - elapsedMs) / 1000)));
    }, 250);

    return () => {
      clearInterval(interval);
    };
  }, [delayMs]);

  return remainingSeconds;
}

/**
 * "Generate corpus", a live
 * progress label while a run is active, and "Generate remaining N" after a
 * run that didn't finish everything.
 */
export function CorpusToolbar({
  language,
  isIngested,
  state,
  onGenerate,
}: {
  language: UiLanguage;
  isIngested: boolean;
  state: GenerationState;
  onGenerate: (options: { force?: boolean }) => void;
}) {
  const labels = UI_LABELS[language];
  const countdownSeconds = useCountdownSeconds(
    state.status === "throttled" ? state.throttleDelayMs : null,
  );
  const isRunning = state.status !== "idle";

  const remaining =
    !isRunning && state.failedCount > 0 && state.endedWithGaps
      ? state.failedCount
      : 0;
  const hasStatus =
    state.status === "throttled" ||
    (state.status === "running" && state.total !== null);

  if (isIngested && remaining === 0 && !hasStatus) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!isIngested ? (
        <Button
          variant="primary"
          onClick={() => {
            onGenerate({});
          }}
          disabled={isRunning}
        >
          {labels.generateCorpus}
        </Button>
      ) : null}

      {remaining > 0 ? (
        <Button
          variant="outline"
          onClick={() => {
            onGenerate({});
          }}
        >
          {labels.generateRemaining(remaining)}
        </Button>
      ) : null}

      {hasStatus ? (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-zinc-600 dark:text-zinc-400"
        >
          {state.status === "throttled"
            ? labels.waitingRateLimit(countdownSeconds)
            : `${labels.generationProgress(state.completed, state.total ?? 0)}${
                state.currentBatch !== null && state.totalBatches !== null
                  ? ` · ${labels.batchProgress(state.currentBatch, state.totalBatches)}`
                  : ""
              }`}
        </p>
      ) : null}
    </div>
  );
}
