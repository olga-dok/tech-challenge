"use client";

import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import type {
  AskQuestionRequestDto,
  Citation,
  RankedCandidate,
  ScreeningStreamEvent,
} from "@repo/contracts";
import { LanguageSwitcher } from "@repo/ui";
import { useActiveRankingStore } from "../application/active-ranking-store";
import {
  IDLE_SCREENING_SESSION_STATE,
  reduceScreeningSession,
  type ConversationMessage,
} from "../domain/screening/screening-session";
import { httpScreeningRepository } from "../infrastructure/screening/http-screening-repository";
import { SourceList } from "./source-list";
import { filterCitationsReferencedInAnswer } from "./source-list";
import { UI_LABELS, type UiLanguage } from "./ui-language";

const SUGGESTED_QUESTIONS = [
  "Who has experience with Python?",
  "Which candidate graduated from UPC?",
  "¿Quién estudió en Universitat Politècnica de Valencia?",
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

function collectCitationSlugs(
  citations: readonly { slug: string }[],
): Set<string> {
  return new Set(citations.map((citation) => citation.slug));
}

export function ChatPanel({
  language,
  onLanguageChange,
}: {
  language: UiLanguage;
  onLanguageChange: (language: UiLanguage) => void;
}) {
  const labels = UI_LABELS[language];
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [session, setSession] = useState(IDLE_SCREENING_SESSION_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const nextMessageIdRef = useRef(0);
  const setRanking = useActiveRankingStore((state) => state.setRanking);
  const latestRankingRef = useRef<readonly RankedCandidate[]>([]);
  const latestCitationsRef = useRef<readonly Citation[]>([]);
  const latestAnswerRef = useRef("");

  const isStreaming = session.isStreaming;

  const canSend = question.trim().length > 0 && !isStreaming;

  const streamingAssistantMessage = useMemo<ConversationMessage | null>(() => {
    if (session.phase === "idle" || session.answer.length === 0) {
      return null;
    }

    return {
      id: "assistant-stream",
      role: "assistant",
      content: session.answer,
      isStreaming,
      citations: session.citations,
    };
  }, [isStreaming, session.answer, session.citations, session.phase]);

  const collapsedAssistantMessageIds = useMemo<Set<string>>(() => {
    const assistantMessages = messages.filter(
      (message) => message.role === "assistant",
    );

    if (assistantMessages.length <= 1) {
      return new Set<string>();
    }

    return new Set(
      assistantMessages
        .slice(0, assistantMessages.length - 1)
        .map((message) => message.id),
    );
  }, [messages]);

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
    latestRankingRef.current = [];
    latestCitationsRef.current = [];
    latestAnswerRef.current = "";

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
          latestRankingRef.current = ranking;
          latestCitationsRef.current = citations;
          const citationSlugs = collectCitationSlugs(citations);
          const rankingForAnswer = ranking.filter((candidate) =>
            citationSlugs.has(candidate.slug),
          );

          setRanking(
            trimmed,
            rankingForAnswer.length > 0 ? rankingForAnswer : ranking,
          );
          const retrievalEvent: ScreeningStreamEvent = {
            type: "retrieval",
            citations: [...citations],
            ranking: [...ranking],
          };
          setSession((prev) => reduceScreeningSession(prev, retrievalEvent));
        },
        onToken: (data) => {
          latestAnswerRef.current += data;
          setSession((prev) =>
            reduceScreeningSession(prev, { type: "token", data }),
          );
        },
        onAnswerEnded: () => {
          const citationsInAnswer = filterCitationsReferencedInAnswer(
            latestCitationsRef.current,
            latestAnswerRef.current,
          );
          const citationSlugs = collectCitationSlugs(citationsInAnswer);
          const refinedRanking = latestRankingRef.current.filter((candidate) =>
            citationSlugs.has(candidate.slug),
          );

          if (refinedRanking.length > 0) {
            setRanking(trimmed, refinedRanking);
          }

          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${String(nextMessageIdRef.current)}`,
              role: "assistant",
              content: latestAnswerRef.current,
              citations: citationsInAnswer,
            },
          ]);
          nextMessageIdRef.current += 1;

          setSession(IDLE_SCREENING_SESSION_STATE);
        },
        onDone: () => {
          setSession((prev) => reduceScreeningSession(prev, { type: "done" }));
          abortRef.current = null;
        },
        onError: (message) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${String(nextMessageIdRef.current)}`,
              role: "assistant",
              content: message,
              isError: true,
            },
          ]);
          nextMessageIdRef.current += 1;
          setSession(IDLE_SCREENING_SESSION_STATE);
          abortRef.current = null;
        },
      },
      { signal: controller.signal },
    );
  };

  return (
    <section className="flex h-[calc(100vh-10rem)] min-h-0 flex-col rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {labels.askTitle}
        </h2>
        <LanguageSwitcher
          ariaLabel="Language"
          value={language}
          options={[
            { label: "EN", value: "en" },
            { label: "ES", value: "es" },
          ]}
          onChange={onLanguageChange}
        />
      </div>
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
            className={
              message.role === "user"
                ? "rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900"
                : "rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
            }
          >
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {message.role === "user" ? "You" : "Assistant"}
            </p>
            {message.isError ? (
              <div
                role="alert"
                className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200"
              >
                <p className="text-sm font-medium">
                  {toElegantError(message.content, language).title}
                </p>
                <p className="mt-0.5 text-xs">
                  {toElegantError(message.content, language).body}
                </p>
                <button
                  type="button"
                  className="mt-2 rounded-md border border-amber-300 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/30 dark:focus-visible:ring-amber-300"
                  onClick={() => {
                    const lastQuestion = [...messages]
                      .reverse()
                      .find((entry) => entry.role === "user")?.content;
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
                {message.role === "assistant" &&
                collapsedAssistantMessageIds.has(message.id) ? (
                  <details className="mt-2 rounded-md border border-zinc-200 bg-zinc-50/50 p-2 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <summary className="cursor-pointer select-none text-xs font-medium text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:text-zinc-200 dark:focus-visible:ring-zinc-100">
                      {labels.previousAnswer}
                    </summary>
                    <div className="prose prose-sm mt-2 max-w-none text-zinc-800 dark:prose-invert dark:text-zinc-200">
                      <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    <SourceList
                      citations={message.citations ?? []}
                      answer={message.content}
                      language={language}
                    />
                  </details>
                ) : message.role === "assistant" ? (
                  <>
                    <div className="prose prose-sm max-w-none text-zinc-800 dark:prose-invert dark:text-zinc-200">
                      <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    <SourceList
                      citations={message.citations ?? []}
                      answer={message.content}
                      language={language}
                    />
                  </>
                ) : (
                  <p className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                    {message.content}
                  </p>
                )}
              </>
            )}
          </div>
        ))}

        {streamingAssistantMessage ? (
          <div className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              Assistant
            </p>
            <div className="prose prose-sm max-w-none text-zinc-800 dark:prose-invert dark:text-zinc-200">
              <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                {streamingAssistantMessage.content}
              </ReactMarkdown>
              {streamingAssistantMessage.isStreaming ? "▍" : ""}
            </div>
            <SourceList
              citations={streamingAssistantMessage.citations ?? []}
              answer={streamingAssistantMessage.content}
              language={language}
            />
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
