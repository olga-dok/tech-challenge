import type { Provider } from '@nestjs/common';
import { GetCandidateUseCase } from '../../Application/GetCandidateUseCase';
import { CvRepositoryId, type CvRepository } from '../../Domain/CvRepository';

export const GetCandidateUseCaseFactory: Provider = {
  provide: GetCandidateUseCase,
  useFactory: (repository: CvRepository): GetCandidateUseCase =>
    new GetCandidateUseCase(repository),
  inject: [CvRepositoryId],
};
