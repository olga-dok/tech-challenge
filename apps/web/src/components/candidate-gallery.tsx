import type { CandidateSummary } from "../domain/corpus/corpus-summary";
import type { RankedCandidate } from "@repo/contracts";
import { CandidateCard } from "./candidate-card";
import type { UiLanguage } from "./ui-language";

/** Responsive grid of candidate cards, with an inline (not modal) notice for generation failures. */
export function CandidateGallery({
  candidates,
  failedCount,
  ranking,
  activeQuestion,
  language,
}: {
  candidates: readonly CandidateSummary[];
  failedCount?: number;
  ranking?: readonly RankedCandidate[];
  activeQuestion?: string;
  language: UiLanguage;
}) {
  const rankingBySlug = new Map(
    (ranking ?? []).map((item) => [item.slug, item]),
  );

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

      <div className="flex flex-col gap-3">
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            rank={rankingBySlug.get(candidate.slug)}
            activeQuestion={activeQuestion}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}
