"use client";

import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import type {
  AskQuestionRequestDto,
  ScreeningStreamEvent,
} from "@repo/contracts";
import { useActiveRankingStore } from "../application/active-ranking-store";
import {
  IDLE_SCREENING_SESSION_STATE,
  reduceScreeningSession,
  type ConversationMessage,
} from "../domain/screening/screening-session";
import { httpScreeningRepository } from "../infrastructure/screening/http-screening-repository";
import { SourceList } from "./source-list";
import { UI_LABELS, type UiLanguage } from "./ui-language";

const SUGGESTED_QUESTIONS = [
  "Who has experience with Python?",
  "Which candidate graduated from UPC?",
  "Who has experience with Universitat Politècnica de Catalunya?",
  "¿Quién tiene experiencia en aprendizaje automático?",
];

function toElegantError(
  message: string | undefined,
  language: UiLanguage,
): { title: string; body: string } {
  const labels = UI_LABELS[language];
  const normalized = message?.toLowerCase() ?? "";
  if (
    normalized.includes("quota") ||
    normalized.includes("rate") ||
    normalized.includes("limit") ||
    normalized.includes("429")
  ) {
    return {
      title: labels.aiTemporarilyUnavailable,
      body: labels.tryAgainSoon,
    };
  }

  return {
    title: labels.aiTemporarilyUnavailable,
    body: labels.tryAgainSoon,
  };
}

export function ChatPanel({ language }: { language: UiLanguage }) {
  const labels = UI_LABELS[language];
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [session, setSession] = useState(IDLE_SCREENING_SESSION_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const nextMessageIdRef = useRef(0);
  const setRanking = useActiveRankingStore((state) => state.setRanking);

  const isStreaming = session.isStreaming;

  const canSend = question.trim().length > 0 && !isStreaming;

  const assistantMessage = useMemo<ConversationMessage | null>(() => {
    if (session.phase === "idle" && session.answer.length === 0) {
      return null;
    }

    return {
      id: "assistant-stream",
      role: "assistant",
      content:
        session.phase === "error"
          ? (session.errorMessage ?? "Something went wrong.")
          : session.answer,
      isStreaming,
      isError: session.phase === "error",
      citations: session.citations,
    };
  }, [isStreaming, session]);

  const elegantError = useMemo(() => {
    if (session.phase !== "error") {
      return null;
    }

    return toElegantError(session.errorMessage, language);
  }, [language, session.errorMessage, session.phase]);

  const stopStreaming = (): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSession((prev) => ({ ...prev, isStreaming: false, phase: "done" }));
  };

  const sendQuestion = (nextQuestion: string): void => {
    const trimmed = nextQuestion.trim();
    if (trimmed.length === 0 || isStreaming) {
      return;
    }

    const userMessage: ConversationMessage = {
      id: `user-${String(nextMessageIdRef.current)}`,
      role: "user",
      content: trimmed,
    };
    nextMessageIdRef.current += 1;
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setSession({
      ...IDLE_SCREENING_SESSION_STATE,
      isStreaming: true,
      phase: "retrieving",
    });

    const controller = new AbortController();
    abortRef.current = controller;

    const request: AskQuestionRequestDto = {
      question: trimmed,
      mode: "grounded",
    };

    httpScreeningRepository.askStream(
      request,
      {
        onStatus: (stage) => {
          setSession((prev) =>
            reduceScreeningSession(prev, { type: "status", stage }),
          );
        },
        onRetrieval: (citations, ranking) => {
          setRanking(trimmed, ranking);
          const retrievalEvent: ScreeningStreamEvent = {
            type: "retrieval",
            citations: [...citations],
            ranking: [...ranking],
          };
          setSession((prev) => reduceScreeningSession(prev, retrievalEvent));
        },
        onToken: (data) => {
          setSession((prev) =>
            reduceScreeningSession(prev, { type: "token", data }),
          );
        },
        onAnswerEnded: () => {
          setSession((prev) =>
            reduceScreeningSession(prev, { type: "answer_ended" }),
          );
        },
        onDone: () => {
          setSession((prev) => reduceScreeningSession(prev, { type: "done" }));
          abortRef.current = null;
        },
        onError: (message) => {
          setSession((prev) =>
            reduceScreeningSession(prev, { type: "error", message }),
          );
          abortRef.current = null;
        },
      },
      { signal: controller.signal },
    );
  };

  return (
    <section className="flex h-full max-h-[calc(100vh-12rem)] flex-col rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {labels.askTitle}
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Ask in natural language; retrieval ranking updates the gallery
        immediately.
      </p>

      <div
        aria-live="polite"
        className="mt-3 flex min-h-40 flex-1 flex-col gap-2 overflow-y-auto"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className="rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900"
          >
            <p className="font-medium text-zinc-900 dark:text-zinc-100">You</p>
            <p className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
              {message.content}
            </p>
          </div>
        ))}

        {assistantMessage ? (
          <div className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              Assistant
            </p>
            {assistantMessage.isError ? (
              <div
                role="alert"
                className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200"
              >
                <p className="text-sm font-medium">{elegantError?.title}</p>
                <p className="mt-0.5 text-xs">{elegantError?.body}</p>
                <button
                  type="button"
                  className="mt-2 rounded-md border border-amber-300 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/30 dark:focus-visible:ring-amber-300"
                  onClick={() => {
                    const lastQuestion = [...messages]
                      .reverse()
                      .find((message) => message.role === "user")?.content;
                    if (lastQuestion) {
                      sendQuestion(lastQuestion);
                    }
                  }}
                >
                  {labels.retry}
                </button>
              </div>
            ) : (
              <>
                <div className="prose prose-sm max-w-none text-zinc-800 dark:prose-invert dark:text-zinc-200">
                  <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                    {assistantMessage.content}
                  </ReactMarkdown>
                  {assistantMessage.isStreaming ? "▍" : ""}
                </div>
                <SourceList
                  citations={assistantMessage.citations ?? []}
                  language={language}
                />
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              sendQuestion(suggestion);
            }}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-100"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className="mt-2 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          sendQuestion(question);
        }}
      >
        <textarea
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
          }}
          rows={2}
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-zinc-100"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendQuestion(question);
            }
          }}
          placeholder={labels.askPlaceholder}
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={stopStreaming}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-100"
          >
            {labels.stop}
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {labels.send}
          </button>
        )}
      </form>
    </section>
  );
}
