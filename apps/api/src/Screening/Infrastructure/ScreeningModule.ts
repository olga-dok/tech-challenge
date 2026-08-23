import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
    // Capped at the controller with @Throttle; this default only matters for
    // routes that don't override it.
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 20 }] }),
  ],
  controllers: [AskQuestionAction],
  providers: [
    CvRetrieverFactory,
    AnswererFactory,
    AnswerCvQuestionUseCaseFactory,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [CvRetrieverId, GroundedAnswererId, AnswerCvQuestionUseCase],
})
export class ScreeningModule {}
