import type { ReactNode } from "react";

/** Shown before a corpus exists — explains what the button does and roughly how long it takes. */
export function EmptyState({ action }: { action: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        No candidates yet
      </h2>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Generate a corpus of realistic CVs, indexed for search as they land. On
        a free-tier key, ~25 candidates takes a few minutes — cards fill in live
        as each one finishes.
      </p>
      {action}
    </div>
  );
}
