"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { GenerateCorpusRequestDto } from "@repo/contracts";
import { useActiveRankingStore } from "../application/active-ranking-store";
import { httpCorpusRepository } from "../infrastructure/corpus/http-corpus-repository";
import { useCandidates } from "../infrastructure/corpus/use-candidates";
import { useCorpusStats } from "../infrastructure/corpus/use-corpus-stats";
import { ActiveFilterChip } from "./active-filter-chip";
import { CandidateGallery } from "./candidate-gallery";
import { ChatPanel } from "./chat-panel";
import { CorpusToolbar } from "./corpus-toolbar";
import { EmptyState } from "./empty-state";
import { GalleryPagination } from "./gallery-pagination";
import { LanguageSwitcher } from "./language-switcher";
import { UI_LABELS, type UiLanguage } from "./ui-language";
import {
  IDLE_GENERATION_STATE,
  type GenerationState,
} from "./generation-state";

const MIN_PAGE_SIZE = 3;
const CARD_HEIGHT_PX = 106;
const CARD_GAP_PX = 12;
const RESERVED_CHROME_PX = 320;

export function CorpusView() {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const rankedQuestion = useActiveRankingStore((state) => state.question);
  const ranking = useActiveRankingStore((state) => state.ranking);
  const rankingActive = useActiveRankingStore((state) => state.isActive);

  const [pageSize, setPageSize] = useState(10);
  const [language, setLanguage] = useState<UiLanguage>(() => {
    if (typeof window === "undefined") {
      return "en";
    }
    const saved = window.localStorage.getItem("ui-language");
    return saved === "en" || saved === "es" ? saved : "en";
  });

  useEffect(() => {
    window.localStorage.setItem("ui-language", language);
  }, [language]);

  useEffect(() => {
    const recalculatePageSize = (): void => {
      const availableHeight = Math.max(
        window.innerHeight - RESERVED_CHROME_PX,
        0,
      );
      const visibleRows = Math.floor(
        (availableHeight + CARD_GAP_PX) / (CARD_HEIGHT_PX + CARD_GAP_PX),
      );
      setPageSize(Math.max(MIN_PAGE_SIZE, visibleRows));
    };

    recalculatePageSize();
    window.addEventListener("resize", recalculatePageSize);

    return () => {
      window.removeEventListener("resize", recalculatePageSize);
    };
  }, []);

  const stats = useCorpusStats();
  const candidatesQuery = useCandidates(
    page,
    pageSize,
    rankingActive ? ranking.map((item) => item.slug) : undefined,
  );
  const [generation, setGeneration] = useState<GenerationState>(
    IDLE_GENERATION_STATE,
  );

  const startGeneration = ({ force = false }: { force?: boolean }): void => {
    setGeneration({
      ...IDLE_GENERATION_STATE,
      status: "running",
      total: generation.total,
    });

    const request: GenerateCorpusRequestDto = {
      size: generation.total ?? 25,
      force,
    };

    httpCorpusRepository.generateStream(request, {
      onPlan: (event) => {
        setGeneration((prev) => ({
          ...prev,
          total: event.total,
          totalBatches: event.batches,
        }));
      },
      onBatchStarted: (event) => {
        setGeneration((prev) => ({
          ...prev,
          status: "running",
          currentBatch: event.batch,
        }));
      },
      onCvCompleted: (event) => {
        setGeneration((prev) => ({
          ...prev,
          completed: prev.completed + 1,
          streamedCandidates: [...prev.streamedCandidates, event.candidate],
        }));
      },
      onCvFailed: () => {
        setGeneration((prev) => ({
          ...prev,
          failedCount: prev.failedCount + 1,
        }));
      },
      onThrottled: (event) => {
        setGeneration((prev) => ({
          ...prev,
          status: "throttled",
          throttleDelayMs: event.delayMs,
        }));
      },
      onDone: (summary) => {
        void Promise.all([stats.mutate(), candidatesQuery.mutate()]).then(
          () => {
            setGeneration((prev) => ({
              ...prev,
              status: "idle",
              failedCount: summary.failed,
              endedWithGaps: summary.failed > 0,
            }));
          },
        );
      },
      onError: () => {
        // A dropped stream: leave the already-generated cards in place and
        // offer the same "resume" affordance a partial failure would.
        setGeneration((prev) => ({
          ...prev,
          status: "idle",
          endedWithGaps: true,
        }));
        void Promise.all([stats.mutate(), candidatesQuery.mutate()]);
      },
    });
  };

  const isRunning = generation.status !== "idle";
  const labels = UI_LABELS[language];
  const candidates = isRunning
    ? generation.streamedCandidates
    : (candidatesQuery.data?.items ?? []);

  if (!isRunning && stats.data?.candidates === 0 && candidates.length === 0) {
    return (
      <EmptyState
        language={language}
        action={
          <CorpusToolbar
            language={language}
            isIngested={false}
            state={generation}
            onGenerate={startGeneration}
          />
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-6">
        <div className="flex items-center justify-end">
          <LanguageSwitcher language={language} onChange={setLanguage} />
        </div>
        <ChatPanel language={language} />
      </div>

      <div className="flex flex-col gap-6">
        <CorpusToolbar
          language={language}
          isIngested={stats.data?.isIngested ?? false}
          state={generation}
          onGenerate={startGeneration}
        />
        {rankingActive ? (
          <ActiveFilterChip language={language} totalMatches={ranking.length} />
        ) : null}
        <CandidateGallery
          candidates={candidates}
          activeQuestion={rankingActive ? rankedQuestion : undefined}
          language={language}
          failedCount={isRunning ? generation.failedCount : undefined}
          ranking={rankingActive ? ranking : undefined}
        />
        {!isRunning && candidatesQuery.data ? (
          <GalleryPagination
            language={language}
            page={page}
            totalPages={candidatesQuery.data.totalPages}
          />
        ) : null}
        {rankingActive ? (
          <p
            aria-live="polite"
            className="text-xs text-zinc-500 dark:text-zinc-400"
          >
            {labels.activeRankingFor} {rankedQuestion}
          </p>
        ) : null}
      </div>
    </div>
  );
}
