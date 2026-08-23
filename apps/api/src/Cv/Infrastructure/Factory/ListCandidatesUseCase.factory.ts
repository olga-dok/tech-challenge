import type { Provider } from '@nestjs/common';
import { ListCandidatesUseCase } from '../../Application/ListCandidatesUseCase';
import { CvRepositoryId, type CvRepository } from '../../Domain/CvRepository';

export const ListCandidatesUseCaseFactory: Provider = {
  provide: ListCandidatesUseCase,
  useFactory: (repository: CvRepository): ListCandidatesUseCase =>
    new ListCandidatesUseCase(repository),
  inject: [CvRepositoryId],
};
