import type { ScreeningStreamEvent } from "@repo/contracts";
import {
  IDLE_SCREENING_SESSION_STATE,
  reduceScreeningSession,
} from "./screening-session";

describe("reduceScreeningSession", () => {
  it("derives state from a successful stream sequence", () => {
    const events: ScreeningStreamEvent[] = [
      { type: "status", stage: "retrieving" },
      {
        type: "retrieval",
        citations: [],
        ranking: [],
      },
      { type: "status", stage: "answering" },
      { type: "token", data: "Hello" },
      { type: "token", data: " world" },
      { type: "answer_ended" },
      { type: "done" },
    ];

    const state = events.reduce(
      reduceScreeningSession,
      IDLE_SCREENING_SESSION_STATE,
    );

    expect(state.phase).toBe("done");
    expect(state.answer).toBe("Hello world");
    expect(state.isStreaming).toBe(false);
  });

  it("handles a mid-stream error", () => {
    const events: ScreeningStreamEvent[] = [
      { type: "status", stage: "retrieving" },
      { type: "token", data: "Partial" },
      { type: "error", message: "provider timeout" },
    ];

    const state = events.reduce(
      reduceScreeningSession,
      IDLE_SCREENING_SESSION_STATE,
    );

    expect(state.phase).toBe("error");
    expect(state.answer).toBe("Partial");
    expect(state.errorMessage).toBe("provider timeout");
    expect(state.isStreaming).toBe(false);
  });
});
