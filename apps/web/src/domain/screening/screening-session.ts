import type {
  Citation,
  ScreeningStage,
  ScreeningStreamEvent,
} from "@repo/contracts";

export type ConversationRole = "user" | "assistant";

export interface ConversationMessage {
  readonly id: string;
  readonly role: ConversationRole;
  readonly content: string;
  readonly citations?: readonly Citation[];
  readonly isStreaming?: boolean;
  readonly isError?: boolean;
}

export type StreamPhase =
  "idle" | "retrieving" | "answering" | "done" | "error";

export interface ScreeningSessionState {
  readonly phase: StreamPhase;
  readonly status?: ScreeningStage;
  readonly answer: string;
  readonly citations: readonly Citation[];
  readonly errorMessage?: string;
  readonly isStreaming: boolean;
}

export const IDLE_SCREENING_SESSION_STATE: ScreeningSessionState = {
  phase: "idle",
  answer: "",
  citations: [],
  isStreaming: false,
};

export function reduceScreeningSession(
  state: ScreeningSessionState,
  event: ScreeningStreamEvent,
): ScreeningSessionState {
  switch (event.type) {
    case "status":
      return {
        ...state,
        phase: event.stage,
        status: event.stage,
        isStreaming: true,
      };
    case "retrieval":
      return {
        ...state,
        citations: event.citations,
      };
    case "token":
      return {
        ...state,
        phase: "answering",
        status: "answering",
        answer: `${state.answer}${event.data}`,
        isStreaming: true,
      };
    case "tool_start":
    case "tool_result":
      return state;
    case "answer_ended":
      return {
        ...state,
        phase: "done",
        isStreaming: false,
      };
    case "done":
      return {
        ...state,
        phase: "done",
        isStreaming: false,
      };
    case "error":
      return {
        ...state,
        phase: "error",
        isStreaming: false,
        errorMessage: event.message,
      };
  }
}
