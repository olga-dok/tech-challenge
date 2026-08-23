import type { ReactNode } from "react";
import { UI_LABELS, type UiLanguage } from "./ui-language";

/** Shown before a corpus exists — explains what the button does and roughly how long it takes. */
export function EmptyState({
  action,
  language,
}: {
  action: ReactNode;
  language: UiLanguage;
}) {
  const labels = UI_LABELS[language];

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {labels.noCandidatesTitle}
      </h2>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        {labels.noCandidatesBody}
      </p>
      {action}
    </div>
  );
}
