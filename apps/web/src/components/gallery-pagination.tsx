"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@repo/ui";

/** Keeps the current page in the `page` search param, so a view is shareable and survives reload. */
export function GalleryPagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) {
    return null;
  }

  const goTo = (target: number): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(target));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <nav
      aria-label="Gallery pages"
      className="flex items-center justify-center gap-3 pt-2"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          goTo(page - 1);
        }}
        disabled={page <= 1}
      >
        Previous
      </Button>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          goTo(page + 1);
        }}
        disabled={page >= totalPages}
      >
        Next
      </Button>
    </nav>
  );
}
