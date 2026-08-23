import {
  AskQuestionRequestSchema,
  ScreeningStreamEventSchema,
  type AskQuestionRequestDto,
  type ScreeningStreamCallbacks,
} from "@repo/contracts";
import type { ScreeningRepository } from "../../domain/screening/screening-repository";
import { readEventStream } from "../sse/read-event-stream";

const PROXY_BASE = "/api/proxy";

export const httpScreeningRepository: ScreeningRepository = {
  askStream(
    request: AskQuestionRequestDto,
    callbacks: ScreeningStreamCallbacks,
    options?: { signal?: AbortSignal },
  ): void {
    const payload = AskQuestionRequestSchema.parse(request);

    fetch(`${PROXY_BASE}/screening/ask`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: options?.signal,
    })
      .then((response) =>
        readEventStream(response, {
          schema: ScreeningStreamEventSchema,
          signal: options?.signal,
          onError: (message) => callbacks.onError?.(message),
          onEvent: (event) => {
            switch (event.type) {
              case "status":
                callbacks.onStatus?.(event.stage);
                break;
              case "retrieval":
                callbacks.onRetrieval?.(event.citations, event.ranking);
                break;
              case "token":
                callbacks.onToken?.(event.data);
                break;
              case "tool_start":
                callbacks.onToolStart?.(event.toolName);
                break;
              case "tool_result":
                callbacks.onToolResult?.(event.toolName, event.summary);
                break;
              case "answer_ended":
                callbacks.onAnswerEnded?.();
                break;
              case "done":
                callbacks.onDone?.();
                break;
              case "error":
                callbacks.onError?.(event.message);
                break;
            }
          },
        }),
      )
      .catch((error: unknown) => {
        if (options?.signal?.aborted) {
          return;
        }

        callbacks.onError?.(
          error instanceof Error ? error.message : String(error),
        );
      });
  },
};
