import type {
  AskQuestionRequestDto,
  ScreeningStreamCallbacks,
} from "@repo/contracts";

export interface AskStreamOptions {
  readonly signal?: AbortSignal;
}

/**
 * Port for the ask stream, independent of fetch/SSE wiring.
 */
export interface ScreeningRepository {
  askStream(
    request: AskQuestionRequestDto,
    callbacks: ScreeningStreamCallbacks,
    options?: AskStreamOptions,
  ): void;
}
