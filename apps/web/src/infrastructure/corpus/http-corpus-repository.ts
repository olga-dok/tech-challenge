import {
  GenerationStreamEventSchema,
  type CandidatePageDto,
  type CorpusStatsDto,
  type GenerateCorpusRequestDto,
  type GenerationStreamCallbacks,
} from "@repo/contracts";
import type { CorpusRepository } from "../../domain/corpus/corpus-repository";
import { readEventStream } from "../sse/read-event-stream";

const PROXY_BASE = "/api/proxy";

async function fetchJson<TResult>(url: string): Promise<TResult> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} responded ${String(response.status)}`);
  }

  return (await response.json()) as TResult;
}

export const httpCorpusRepository: CorpusRepository = {
  async listCandidates(
    page: number,
    pageSize: number,
    slugs?: readonly string[],
  ): Promise<CandidatePageDto> {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (slugs && slugs.length > 0) {
      params.set("slugs", slugs.join(","));
    }

    return fetchJson<CandidatePageDto>(
      `${PROXY_BASE}/cvs?${params.toString()}`,
    );
  },

  async getStats(): Promise<CorpusStatsDto> {
    return fetchJson<CorpusStatsDto>(`${PROXY_BASE}/corpus/stats`);
  },

  generateStream(
    request: GenerateCorpusRequestDto,
    callbacks: GenerationStreamCallbacks,
    signal?: AbortSignal,
  ): void {
    fetch(`${PROXY_BASE}/cvs/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal,
    })
      .then((response) =>
        readEventStream(response, {
          schema: GenerationStreamEventSchema,
          onError: (message) => callbacks.onError?.(message),
          signal,
          onEvent: (event) => {
            switch (event.type) {
              case "plan":
                callbacks.onPlan?.(event);
                break;
              case "batch_started":
                callbacks.onBatchStarted?.(event);
                break;
              case "cv_started":
                callbacks.onCvStarted?.(event);
                break;
              case "cv_completed":
                callbacks.onCvCompleted?.(event);
                break;
              case "cv_failed":
                callbacks.onCvFailed?.(event);
                break;
              case "batch_completed":
                callbacks.onBatchCompleted?.(event);
                break;
              case "throttled":
                callbacks.onThrottled?.(event);
                break;
              case "ingest_started":
                callbacks.onIngestStarted?.();
                break;
              case "ingest_progress":
                callbacks.onIngestProgress?.(event);
                break;
              case "done":
                callbacks.onDone?.(event.summary);
                break;
              case "error":
                callbacks.onError?.(event.message);
                break;
            }
          },
        }),
      )
      .catch((error: unknown) => {
        if (signal?.aborted) {
          return;
        }
        callbacks.onError?.(
          error instanceof Error ? error.message : String(error),
        );
      });
  },
};
