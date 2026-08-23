import type { Citation } from "@repo/contracts";
import { UI_LABELS, type UiLanguage } from "./ui-language";

export function SourceList({
  citations,
  language,
}: {
  citations: readonly Citation[];
  language: UiLanguage;
}) {
  const labels = UI_LABELS[language];

  if (citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {labels.sources}
      </p>
      {citations.map((citation, index) => (
        <a
          key={`${citation.slug}-${String(citation.ordinal)}-${citation.section}`}
          href={`/api/proxy/cvs/${citation.slug}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-zinc-300 px-2 py-1 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-100"
          title={citation.snippet}
        >
          [{index + 1}] {citation.section} · {citation.score.toFixed(2)}
        </a>
      ))}
    </div>
  );
}
