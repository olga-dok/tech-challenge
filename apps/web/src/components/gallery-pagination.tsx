"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PaginationControls } from "@repo/ui";
import { UI_LABELS, type UiLanguage } from "./ui-language";

/** Keeps the current page in the `page` search param, so a view is shareable and survives reload. */
export function GalleryPagination({
  language,
  page,
  totalPages,
}: {
  language: UiLanguage;
  page: number;
  totalPages: number;
}) {
  const labels = UI_LABELS[language];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goTo = (target: number): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(target));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <PaginationControls
      ariaLabel={labels.galleryPages}
      previousLabel={labels.previous}
      nextLabel={labels.next}
      pageLabel={labels.pageOf(page, totalPages)}
      page={page}
      totalPages={totalPages}
      onPrevious={() => {
        goTo(page - 1);
      }}
      onNext={() => {
        goTo(page + 1);
      }}
    />
  );
}
