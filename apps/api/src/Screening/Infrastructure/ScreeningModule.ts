import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { CvModule } from '../../Cv/Infrastructure/CvModule';
import { HttpModule } from '../../Shared/Infrastructure/Http';
import { PrismaModule } from '../../Shared/Infrastructure/Prisma';
import { AnswerCvQuestionUseCase } from '../Application/AnswerCvQuestionUseCase';
import { CvRetrieverId } from '../Domain/CvRetriever';
import { GroundedAnswererId } from '../Domain/GroundedAnswerer';
import { AskQuestionAction } from './Action/AskQuestionAction';
import { AnswerCvQuestionUseCaseFactory } from './Factory/AnswerCvQuestionUseCase.factory';
import { AnswererFactory } from './Factory/Answerer.factory';
import { CvRetrieverFactory } from './Factory/CvRetriever.factory';

/**
 * The Screening context: retrieval, and now grounded answering over SSE.
 * Depends on `CvModule` for the embedder port, the ingested-corpus check, and
 * reads `Cv`'s tables directly for the hybrid SQL arms — a deliberate
 * cross-context read in a single-Postgres monolith, never a write.
 */
@Module({
  imports: [
    HttpModule,
    PrismaModule,
    CvModule,
    // A default is required by the module even though every route that
    // actually uses it overrides it with its own @Throttle — see
    // AskQuestionAction. Not registered as a global guard: this limit exists
    // to cap LLM cost on /screening/ask specifically, not ordinary gallery
    // browsing (candidate list, portraits, PDFs), which would otherwise trip
    // it on a single page load.
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 20 }] }),
  ],
  controllers: [AskQuestionAction],
  providers: [
    CvRetrieverFactory,
    AnswererFactory,
    AnswerCvQuestionUseCaseFactory,
  ],
  exports: [CvRetrieverId, GroundedAnswererId, AnswerCvQuestionUseCase],
})
export class ScreeningModule {}
