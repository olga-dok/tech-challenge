import type { Provider } from '@nestjs/common';
import { GetCorpusStatsUseCase } from '../../../Cv/Application/GetCorpusStatsUseCase';
import { LoggerId, type Logger } from '../../../Shared/Domain';
import { AnswerCvQuestionUseCase } from '../../Application/AnswerCvQuestionUseCase';
import { CvRetrieverId, type CvRetriever } from '../../Domain/CvRetriever';
import {
  GroundedAnswererId,
  type GroundedAnswerer,
} from '../../Domain/GroundedAnswerer';

export const AnswerCvQuestionUseCaseFactory: Provider = {
  provide: AnswerCvQuestionUseCase,
  useFactory: (
    retriever: CvRetriever,
    answerer: GroundedAnswerer,
    corpusStats: GetCorpusStatsUseCase,
    logger: Logger,
  ): AnswerCvQuestionUseCase =>
    new AnswerCvQuestionUseCase(retriever, answerer, corpusStats, logger),
  inject: [CvRetrieverId, GroundedAnswererId, GetCorpusStatsUseCase, LoggerId],
};
