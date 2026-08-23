import type {
  GenerateCorpusRequestDto,
  GenerationStreamCallbacks,
} from "@repo/contracts";
import type { CandidatePage, CorpusStats } from "./corpus-summary";

/**
 * How the rest of the app reaches the corpus, independent of fetch/SWR/the
 * proxy route. `generateStream` is fire-and-forget — callbacks drive UI
 * state, there is nothing meaningful to await.
 */
export interface CorpusRepository {
  listCandidates(
    page: number,
    pageSize: number,
    slugs?: readonly string[],
  ): Promise<CandidatePage>;
  getStats(): Promise<CorpusStats>;
  generateStream(
    request: GenerateCorpusRequestDto,
    callbacks: GenerationStreamCallbacks,
    signal?: AbortSignal,
  ): void;
}
