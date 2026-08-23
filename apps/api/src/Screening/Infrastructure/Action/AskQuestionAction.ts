import { Body, Controller, Inject, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
