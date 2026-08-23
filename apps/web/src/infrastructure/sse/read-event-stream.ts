import type { ZodType } from "zod";

export interface ReadEventStreamOptions<TEvent> {
  readonly schema: ZodType<TEvent>;
  readonly onEvent: (event: TEvent) => void;
  readonly onError: (message: string) => void;
  readonly signal?: AbortSignal;
}

/**
 * Reads a `data: ...\n\n`-framed SSE response (the shape every stream in this
 * app produces — see the API's `pipeEventStream`) and dispatches each frame's
 * payload, validated against `schema`, to `onEvent`.
 *
 * Buffers across chunk boundaries rather than treating each chunk as one
 * complete frame: a frame boundary — or the JSON inside a frame — can land
 * anywhere in the byte stream, and assuming otherwise is the classic bug here.
 * Never throws; every failure mode (bad status, no body, a malformed frame)
 * goes through `onError` instead, so one bad frame doesn't kill the stream
 * for the frames after it.
 */
export async function readEventStream<TEvent>(
  response: Response,
  options: ReadEventStreamOptions<TEvent>,
): Promise<void> {
  if (!response.ok) {
    options.onError(`Request failed with status ${String(response.status)}`);
    return;
  }

  if (!response.body) {
    options.onError("Response had no body to stream");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const onAbort = (): void => {
    reader.cancel().catch(() => {
      // The stream is being torn down anyway; nothing to report.
    });
  };
  options.signal?.addEventListener("abort", onAbort);

  try {
    for (;;) {
      if (options.signal?.aborted) {
        return;
      }

      const { done, value } = await reader.read();
      if (done) {
        return;
      }

      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        dispatchFrame(frame, options);

        boundary = buffer.indexOf("\n\n");
      }
    }
  } catch (error: unknown) {
    if (!options.signal?.aborted) {
      options.onError(error instanceof Error ? error.message : String(error));
    }
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}

function dispatchFrame<TEvent>(
  frame: string,
  options: ReadEventStreamOptions<TEvent>,
): void {
  for (const line of frame.split("\n")) {
    if (!line.startsWith("data:")) {
      continue;
    }

    const payload = line.slice("data:".length).trim();
    if (payload.length === 0) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(payload);
      options.onEvent(options.schema.parse(parsed));
    } catch {
      options.onError("Received a malformed event from the server");
    }
  }
}
