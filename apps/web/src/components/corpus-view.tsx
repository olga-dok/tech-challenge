"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  clampPage,
  rankingChanged,
  rankingQuestionChanged,
} from "./ranked-pagination";
import type { UiLanguage } from "./ui-language";
import {
  IDLE_GENERATION_STATE,
  type GenerationState,
} from "./generation-state";

const MIN_PAGE_SIZE = 3;
const CARD_HEIGHT_PX = 106;
const CARD_GAP_PX = 12;
const RESERVED_CHROME_PX = 240;

export function CorpusView({
  language,
  onLanguageChange,
}: {
  language: UiLanguage;
  onLanguageChange: (language: UiLanguage) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const rankedQuestion = useActiveRankingStore((state) => state.question);
  const ranking = useActiveRankingStore((state) => state.ranking);
  const rankingActive = useActiveRankingStore((state) => state.isActive);
  const rankingSignature = useMemo(
    () => ranking.map((item) => item.slug).join(","),
    [ranking],
  );
  const previousRankingSignature = useRef<string>(rankingSignature);
  const previousRankedQuestion = useRef<string>(rankedQuestion);

  const [pageSize, setPageSize] = useState(10);

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

  useEffect(() => {
    const hasRankingChanged = rankingChanged(
      previousRankingSignature.current,
      rankingSignature,
    );
    const hasQuestionChanged = rankingQuestionChanged(
      previousRankedQuestion.current,
      rankedQuestion,
    );
    previousRankingSignature.current = rankingSignature;
    previousRankedQuestion.current = rankedQuestion;

    if ((!hasRankingChanged && !hasQuestionChanged) || page === 1) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  }, [page, pathname, rankedQuestion, rankingSignature, router, searchParams]);

  useEffect(() => {
    const totalPages = candidatesQuery.data?.totalPages;
    if (!totalPages) {
      return;
    }

    const targetPage = clampPage(page, totalPages);
    if (targetPage === page) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    router.replace(`${pathname}?${params.toString()}`);
  }, [candidatesQuery.data?.totalPages, page, pathname, router, searchParams]);

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
    <div className="grid grid-cols-1 gap-4 lg:h-[calc(100vh-10rem)] lg:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-4">
        <ChatPanel language={language} onLanguageChange={onLanguageChange} />
      </div>

      <div className="flex min-h-0 flex-col gap-3">
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
      </div>
    </div>
  );
}
