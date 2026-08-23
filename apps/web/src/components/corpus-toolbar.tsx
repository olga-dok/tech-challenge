"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui";
import type { GenerationState } from "./generation-state";

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
 * "Generate corpus" / "Regenerate" (confirm-gated — it costs minutes), a live
 * progress label while a run is active, and "Generate remaining N" after a
 * run that didn't finish everything.
 */
export function CorpusToolbar({
  isIngested,
  state,
  onGenerate,
}: {
  isIngested: boolean;
  state: GenerationState;
  onGenerate: (options: { force?: boolean }) => void;
}) {
  const countdownSeconds = useCountdownSeconds(
    state.status === "throttled" ? state.throttleDelayMs : null,
  );
  const isRunning = state.status !== "idle";

  const handleRegenerate = (): void => {
    if (
      window.confirm(
        "Regenerating replaces the existing corpus and takes a few minutes. Continue?",
      )
    ) {
      onGenerate({ force: true });
    }
  };

  const remaining =
    !isRunning && state.failedCount > 0 && state.endedWithGaps
      ? state.failedCount
      : 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isIngested ? (
        <Button
          variant="secondary"
          onClick={handleRegenerate}
          disabled={isRunning}
        >
          Regenerate
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={() => {
            onGenerate({});
          }}
          disabled={isRunning}
        >
          Generate corpus
        </Button>
      )}

      {remaining > 0 ? (
        <Button
          variant="outline"
          onClick={() => {
            onGenerate({});
          }}
        >
          Generate remaining {remaining}
        </Button>
      ) : null}

      <p
        role="status"
        aria-live="polite"
        className="text-sm text-zinc-600 dark:text-zinc-400"
      >
        {state.status === "throttled"
          ? `waiting out a rate limit — resuming in ${String(countdownSeconds)}s`
          : state.status === "running" && state.total !== null
            ? `${String(state.completed)} of ${String(state.total)}${
                state.currentBatch !== null && state.totalBatches !== null
                  ? ` · batch ${String(state.currentBatch)} of ${String(state.totalBatches)}`
                  : ""
              }`
            : null}
      </p>
    </div>
  );
}
