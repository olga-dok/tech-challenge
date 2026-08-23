import useSWR, { type SWRResponse } from "swr";
import type { CorpusStats } from "../../domain/corpus/corpus-summary";
import { httpCorpusRepository } from "./http-corpus-repository";

export function useCorpusStats(): SWRResponse<CorpusStats> {
  return useSWR("corpus-stats", () => httpCorpusRepository.getStats());
}
