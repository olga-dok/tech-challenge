/**
 * Decodes an incoming Server-Sent-Events body into its `data:` payloads.
 *
 * The mirror image of the outgoing SSE writer (`pipeEventStream`): this side
 * *consumes* a provider's stream (Gemini, OpenRouter) rather than producing
 * one. Buffers partial lines across chunk boundaries — a chunk boundary can
 * land anywhere, including mid-JSON or mid-"data:" prefix, and treating each
 * chunk as a complete line is the classic bug this exists to avoid.
 */
export async function* readSseLines(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
        buffer = buffer.slice(newlineIndex + 1);

        if (line.startsWith('data:')) {
          const payload = line.slice('data:'.length).trim();
          if (payload.length > 0) {
            yield payload;
          }
        }

        newlineIndex = buffer.indexOf('\n');
      }
    }

    const trailing = buffer.replace(/\r$/, '');
    if (trailing.startsWith('data:')) {
      const payload = trailing.slice('data:'.length).trim();
      if (payload.length > 0) {
        yield payload;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
