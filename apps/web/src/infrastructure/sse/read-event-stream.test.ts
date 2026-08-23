/**
 * @jest-environment node
 *
 * Pure stream/parsing logic, no DOM dependency — run under Node's real,
 * unpolyfilled ReadableStream/TextDecoder/Response rather than jsdom's
 * incomplete Web Streams support.
 */
import { z } from "zod";
import { readEventStream } from "./read-event-stream";

const eventSchema = z.object({
  type: z.literal("ping"),
  value: z.number(),
});
type PingEvent = z.infer<typeof eventSchema>;

const streamFrom = (chunks: readonly string[]): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[index]));
      index += 1;
    },
  });
};

const responseFor = (
  chunks: readonly string[],
  init: { status?: number; noBody?: boolean } = {},
): Response =>
  new Response(init.noBody ? null : streamFrom(chunks), {
    status: init.status ?? 200,
  });

describe("readEventStream", () => {
  it("dispatches one event per frame", async () => {
    const events: PingEvent[] = [];
    await readEventStream(
      responseFor([
        'data: {"type":"ping","value":1}\n\ndata: {"type":"ping","value":2}\n\n',
      ]),
      {
        schema: eventSchema,
        onEvent: (event) => events.push(event),
        onError: jest.fn(),
      },
    );

    expect(events).toEqual([
      { type: "ping", value: 1 },
      { type: "ping", value: 2 },
    ]);
  });

  it("buffers a frame whose JSON is split across two chunk boundaries", async () => {
    const events: PingEvent[] = [];
    await readEventStream(
      responseFor(['data: {"type":"ping","valu', 'e":42}\n\n']),
      {
        schema: eventSchema,
        onEvent: (event) => events.push(event),
        onError: jest.fn(),
      },
    );

    expect(events).toEqual([{ type: "ping", value: 42 }]);
  });

  it("calls onError without throwing for a non-ok response", async () => {
    const onError = jest.fn();
    await expect(
      readEventStream(responseFor([], { status: 500 }), {
        schema: eventSchema,
        onEvent: jest.fn(),
        onError,
      }),
    ).resolves.toBeUndefined();

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("calls onError for a response with no body", async () => {
    const onError = jest.fn();
    await readEventStream(responseFor([], { noBody: true }), {
      schema: eventSchema,
      onEvent: jest.fn(),
      onError,
    });

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("reports an unparseable frame via onError and keeps processing later frames", async () => {
    const events: PingEvent[] = [];
    const onError = jest.fn();
    await readEventStream(
      responseFor(['data: not-json\n\ndata: {"type":"ping","value":7}\n\n']),
      { schema: eventSchema, onEvent: (event) => events.push(event), onError },
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(events).toEqual([{ type: "ping", value: 7 }]);
  });

  it("reports a frame that fails schema validation via onError", async () => {
    const onError = jest.fn();
    await readEventStream(
      responseFor(['data: {"type":"pong","value":1}\n\n']),
      { schema: eventSchema, onEvent: jest.fn(), onError },
    );

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("stops cleanly and skips onError when aborted mid-stream", async () => {
    const controller = new AbortController();
    const onError = jest.fn();
    const onEvent = jest.fn(() => {
      controller.abort();
    });

    await readEventStream(
      responseFor([
        'data: {"type":"ping","value":1}\n\ndata: {"type":"ping","value":2}\n\n',
      ]),
      { schema: eventSchema, onEvent, onError, signal: controller.signal },
    );

    expect(onError).not.toHaveBeenCalled();
  });
});
