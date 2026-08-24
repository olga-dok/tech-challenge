import type { RankedCandidate } from "@repo/contracts";
import { StatusBanner } from "@repo/ui";
import type { CandidateSummary } from "../domain/corpus/corpus-summary";
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
        <StatusBanner tone="warning">
          {failedCount} {failedCount === 1 ? "CV" : "CVs"} failed to generate.
        </StatusBanner>
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
