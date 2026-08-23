import type { Provider } from '@nestjs/common';
import { GetCorpusStatsUseCase } from '../../Application/GetCorpusStatsUseCase';
import { CvRepositoryId, type CvRepository } from '../../Domain/CvRepository';

export const GetCorpusStatsUseCaseFactory: Provider = {
  provide: GetCorpusStatsUseCase,
  useFactory: (repository: CvRepository): GetCorpusStatsUseCase =>
    new GetCorpusStatsUseCase(repository),
  inject: [CvRepositoryId],
};
