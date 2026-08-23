import type { CvRepository } from '../Domain/CvRepository';

export interface CorpusStatsResult {
  readonly candidates: number;
  readonly chunks: number;
  readonly avgChunksPerCandidate: number;
  readonly lastIngestedAt: Date | null;
  readonly isIngested: boolean;
}

/**
 * `avgChunksPerCandidate` and `isIngested` are business rules, not
 * persistence, so they are computed here rather than in the repository. The
 * wire format (an ISO date string) is the Action's job to produce, same as
 * every other use case returning domain-shaped data.
 */
export class GetCorpusStatsUseCase {
  constructor(private readonly repository: CvRepository) {}

  async execute(): Promise<CorpusStatsResult> {
    const { candidates, chunks, lastIngestedAt } =
      await this.repository.corpusStats();

    return {
      candidates,
      chunks,
      avgChunksPerCandidate: candidates === 0 ? 0 : chunks / candidates,
      lastIngestedAt,
      isIngested: candidates > 0 && chunks > 0,
    };
  }
}
