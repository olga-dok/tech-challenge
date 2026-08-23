// Literal aliases, not reshaped copies: @repo/contracts is the single source
// of truth for anything crossing the frontend/backend boundary.
export type {
  CandidatePageDto as CandidatePage,
  CandidateSummaryDto as CandidateSummary,
  CorpusStatsDto as CorpusStats,
} from "@repo/contracts";
