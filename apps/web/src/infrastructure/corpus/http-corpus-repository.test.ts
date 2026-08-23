/**
 * @jest-environment node
 *
 * Deals with real Response/ReadableStream objects directly — same reasoning
 * as read-event-stream.test.ts.
 */
import type { GenerationStreamCallbacks } from "@repo/contracts";
import { httpCorpusRepository } from "./http-corpus-repository";

const streamFrom = (frames: readonly string[]): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= frames.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(`data: ${frames[index]}\n\n`));
      index += 1;
    },
  });
};

const mockFetchWithFrames = (frames: readonly string[]): jest.Mock =>
  jest
    .fn()
    .mockResolvedValue(new Response(streamFrom(frames), { status: 200 }));

const callbacksStub = (): GenerationStreamCallbacks & {
  calls: Record<string, unknown[]>;
} => {
  const calls: Record<string, unknown[]> = {};
  const record =
    (name: string) =>
    (...args: unknown[]): void => {
      (calls[name] ??= []).push(args);
    };

  return {
    calls,
    onPlan: record("onPlan"),
    onBatchStarted: record("onBatchStarted"),
    onCvStarted: record("onCvStarted"),
    onCvCompleted: record("onCvCompleted"),
    onCvFailed: record("onCvFailed"),
    onBatchCompleted: record("onBatchCompleted"),
    onThrottled: record("onThrottled"),
    onIngestStarted: record("onIngestStarted"),
    onIngestProgress: record("onIngestProgress"),
    onDone: record("onDone"),
    onError: record("onError"),
  };
};

const flush = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe("httpCorpusRepository.generateStream", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("maps plan, cv_completed, and done to the matching callbacks", async () => {
    global.fetch = mockFetchWithFrames([
      JSON.stringify({ type: "plan", total: 1, batches: 1, batchSize: 1 }),
      JSON.stringify({
        type: "cv_completed",
        index: 0,
        candidate: {
          id: "8f14e45f-ceea-467e-adc0-14dbc8f5c882",
          slug: "ana-ruiz",
          fullName: "Ana Ruiz",
          headline: "Backend Engineer",
          location: "Madrid",
          topSkills: ["Go"],
          yearsExperience: 5,
          seniority: "SENIOR",
          portraitUrl: "/cvs/ana-ruiz/portrait",
          pdfUrl: "/cvs/ana-ruiz/pdf",
        },
      }),
      JSON.stringify({
        type: "done",
        summary: {
          generated: 1,
          failed: 0,
          skipped: 0,
          chunks: 3,
          durationMs: 100,
        },
      }),
    ]);

    const callbacks = callbacksStub();
    httpCorpusRepository.generateStream(
      { size: 1, seed: 1, force: false },
      callbacks,
    );
    await flush();

    expect(callbacks.calls.onPlan).toHaveLength(1);
    expect(callbacks.calls.onCvCompleted).toHaveLength(1);
    expect(callbacks.calls.onDone).toEqual([
      [{ generated: 1, failed: 0, skipped: 0, chunks: 3, durationMs: 100 }],
    ]);
  });

  it("maps throttled and error events", async () => {
    global.fetch = mockFetchWithFrames([
      JSON.stringify({ type: "throttled", batch: 1, delayMs: 2000 }),
      JSON.stringify({ type: "error", message: "boom" }),
    ]);

    const callbacks = callbacksStub();
    httpCorpusRepository.generateStream(
      { size: 1, seed: 1, force: false },
      callbacks,
    );
    await flush();

    expect(callbacks.calls.onThrottled).toEqual([
      [{ type: "throttled", batch: 1, delayMs: 2000 }],
    ]);
    expect(callbacks.calls.onError).toEqual([["boom"]]);
  });
});
