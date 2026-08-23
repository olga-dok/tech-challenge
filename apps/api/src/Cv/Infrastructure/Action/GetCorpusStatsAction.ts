import { Controller, Get } from '@nestjs/common';
import type { CorpusStatsDto } from '@repo/contracts';
import { GetCorpusStatsUseCase } from '../../Application/GetCorpusStatsUseCase';

@Controller('corpus')
export class GetCorpusStatsAction {
  constructor(private readonly useCase: GetCorpusStatsUseCase) {}

  @Get('stats')
  async handle(): Promise<CorpusStatsDto> {
    const stats = await this.useCase.execute();

    return {
      candidates: stats.candidates,
      chunks: stats.chunks,
      avgChunksPerCandidate: stats.avgChunksPerCandidate,
      lastIngestedAt: stats.lastIngestedAt?.toISOString() ?? null,
      isIngested: stats.isIngested,
    };
  }
}
