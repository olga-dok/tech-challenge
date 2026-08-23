import type { HTMLAttributes } from "react";

export function Spinner({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-100 ${className}`}
      {...props}
    />
  );
}
