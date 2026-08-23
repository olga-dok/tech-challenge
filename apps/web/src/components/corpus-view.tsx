"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { GenerateCorpusRequestDto } from "@repo/contracts";
import { httpCorpusRepository } from "../infrastructure/corpus/http-corpus-repository";
import { useCandidates } from "../infrastructure/corpus/use-candidates";
import { useCorpusStats } from "../infrastructure/corpus/use-corpus-stats";
import { CandidateGallery } from "./candidate-gallery";
import { CorpusToolbar } from "./corpus-toolbar";
import { EmptyState } from "./empty-state";
import { GalleryPagination } from "./gallery-pagination";
import {
  IDLE_GENERATION_STATE,
  type GenerationState,
} from "./generation-state";

const PAGE_SIZE = 12;

export function CorpusView() {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const stats = useCorpusStats();
  const candidatesQuery = useCandidates(page, PAGE_SIZE);
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
  const candidates = isRunning
    ? generation.streamedCandidates
    : (candidatesQuery.data?.items ?? []);

  if (!isRunning && stats.data?.candidates === 0 && candidates.length === 0) {
    return (
      <EmptyState
        action={
          <CorpusToolbar
            isIngested={false}
            state={generation}
            onGenerate={startGeneration}
          />
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CorpusToolbar
        isIngested={stats.data?.isIngested ?? false}
        state={generation}
        onGenerate={startGeneration}
      />
      <CandidateGallery
        candidates={candidates}
        failedCount={isRunning ? generation.failedCount : undefined}
      />
      {!isRunning && candidatesQuery.data ? (
        <GalleryPagination
          page={page}
          totalPages={candidatesQuery.data.totalPages}
        />
      ) : null}
    </div>
  );
}
