import type { CandidateSummary } from "../domain/corpus/corpus-summary";
import { CandidateCard } from "./candidate-card";

/** Responsive grid of candidate cards, with an inline (not modal) notice for generation failures. */
export function CandidateGallery({
  candidates,
  failedCount,
}: {
  candidates: readonly CandidateSummary[];
  failedCount?: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      {failedCount !== undefined && failedCount > 0 ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        >
          {failedCount} {failedCount === 1 ? "CV" : "CVs"} failed to generate.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {candidates.map((candidate) => (
          <CandidateCard key={candidate.id} candidate={candidate} />
        ))}
      </div>
    </div>
  );
}
