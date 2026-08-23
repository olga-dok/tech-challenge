"use client";

import { useActiveRankingStore } from "../application/active-ranking-store";
import type { UiLanguage } from "./ui-language";
import { UI_LABELS } from "./ui-language";

export function ActiveFilterChip({
  totalMatches,
  language,
}: {
  totalMatches: number;
  language: UiLanguage;
}) {
  const labels = UI_LABELS[language];
  const question = useActiveRankingStore((state) => state.question);
  const isActive = useActiveRankingStore((state) => state.isActive);
  const clearRanking = useActiveRankingStore((state) => state.clearRanking);

  if (!isActive) {
    return null;
  }

  return (
    <div aria-live="polite" className="flex items-center gap-3">
      <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
        {labels.showingMatchesFor} {question}
      </span>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        {labels.matchingCandidates(totalMatches)}
      </span>
      <button
        type="button"
        onClick={clearRanking}
        className="rounded-full border border-zinc-300 px-2 py-0.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-100"
        aria-label={labels.clearRanking}
        title={labels.clearRanking}
      >
        ✕
      </button>
    </div>
  );
}
