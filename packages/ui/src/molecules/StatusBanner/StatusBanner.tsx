import type { ReactNode } from "react";

export function StatusBanner({
  tone = "warning",
  children,
}: {
  tone?: "warning" | "info";
  children: ReactNode;
}) {
  const toneClassName =
    tone === "warning"
      ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";

  return (
    <p
      role="status"
      aria-live="polite"
      className={`rounded-md px-3 py-2 text-sm ${toneClassName}`}
    >
      {children}
    </p>
  );
}
