import { Body, Controller, Inject, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  AskQuestionRequestSchema,
  type AskQuestionRequestDto,
} from '@repo/contracts';
import type { Response } from 'express';
import { LoggerId, type Logger } from '../../../Shared/Domain';
import { pipeEventStream } from '../../../Shared/Infrastructure/Sse';
import { ZodValidationPipe } from '../../../Shared/Infrastructure/Validation';
import { AnswerCvQuestionUseCase } from '../../Application/AnswerCvQuestionUseCase';
import { Question } from '../../Domain/Question';

@Controller('screening')
// Scoped to this controller, not global: this caps LLM cost on /screening/ask
// specifically. A global guard would also throttle plain gallery browsing —
// the candidate list, portraits, and PDFs — which has nothing to do with LLM
// spend and fires far more than 20 requests/minute on an ordinary page load.
@UseGuards(ThrottlerGuard)
export class AskQuestionAction {
  constructor(
    private readonly useCase: AnswerCvQuestionUseCase,
    @Inject(LoggerId) private readonly logger: Logger,
  ) {}

  /**
   * `CorpusNotIngestedError` is thrown by `execute()` *before* it returns a
   * stream, so `await`ing it here means that case reaches the client as a
   * clean 422 via the global `ProblemDetailsFilter` — never an opened SSE
   * connection.
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('ask')
  async handle(
    @Body(new ZodValidationPipe(AskQuestionRequestSchema))
    body: AskQuestionRequestDto,
    @Res() response: Response,
  ): Promise<void> {
    this.logger.info('Question asked', { mode: body.mode });

    const stream = await this.useCase.execute({
      question: Question.from(body.question),
      mode: body.mode,
    });

    pipeEventStream(response, stream, this.logger);
  }
}
