import useSWR, { type SWRResponse } from "swr";
import type { CandidatePage } from "../../domain/corpus/corpus-summary";
import { httpCorpusRepository } from "./http-corpus-repository";

/**
 * Keyed on page/pageSize/slugs so a page change or a ranking change (Step
 * 15's ordered `slugs`) refetches cleanly rather than serving a stale page
 * from cache.
 */
export function useCandidates(
  page: number,
  pageSize: number,
  slugs?: readonly string[],
): SWRResponse<CandidatePage> {
  return useSWR(["candidates", page, pageSize, slugs?.join(",") ?? null], () =>
    httpCorpusRepository.listCandidates(page, pageSize, slugs),
  );
}
