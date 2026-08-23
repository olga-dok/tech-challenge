import { create } from "zustand";
import type { RankedCandidate } from "@repo/contracts";

interface ActiveRankingState {
  readonly question: string;
  readonly ranking: readonly RankedCandidate[];
  readonly isActive: boolean;
  setRanking: (question: string, ranking: readonly RankedCandidate[]) => void;
  clearRanking: () => void;
}

export const useActiveRankingStore = create<ActiveRankingState>((set) => ({
  question: "",
  ranking: [],
  isActive: false,
  setRanking: (question, ranking) => {
    set({ question, ranking, isActive: ranking.length > 0 });
  },
  clearRanking: () => {
    set({ question: "", ranking: [], isActive: false });
  },
}));
