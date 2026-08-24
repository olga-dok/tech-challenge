import type { ReactNode } from "react";
import { EmptyState as UiEmptyState } from "@repo/ui";
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
    <UiEmptyState
      title={labels.noCandidatesTitle}
      body={labels.noCandidatesBody}
      action={action}
    />
  );
}
