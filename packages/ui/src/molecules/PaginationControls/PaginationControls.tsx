import { Button } from "../../atoms/Button";

export function PaginationControls({
  ariaLabel,
  previousLabel,
  nextLabel,
  pageLabel,
  page,
  totalPages,
  onPrevious,
  onNext,
}: {
  ariaLabel: string;
  previousLabel: string;
  nextLabel: string;
  pageLabel: string;
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label={ariaLabel} className="flex items-center justify-center gap-3 pt-2">
      <Button variant="outline" size="sm" onClick={onPrevious} disabled={page <= 1}>
        {previousLabel}
      </Button>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{pageLabel}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={page >= totalPages}
      >
        {nextLabel}
      </Button>
    </nav>
  );
}
