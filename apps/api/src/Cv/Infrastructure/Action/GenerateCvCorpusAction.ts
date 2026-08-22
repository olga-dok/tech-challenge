import {
  Body,
  ConflictException,
  Controller,
  Inject,
  Post,
  Res,
} from '@nestjs/common';
import {
  GenerateCorpusRequestSchema,
  type GenerateCorpusRequestDto,
} from '@repo/contracts';
import type { Response } from 'express';
import { finalize } from 'rxjs';
import { LoggerId, type Logger } from '../../../Shared/Domain';
import {
  APP_CONFIG,
  type AppConfig,
} from '../../../Shared/Infrastructure/Config';
import { pipeEventStream } from '../../../Shared/Infrastructure/Sse';
import { ZodValidationPipe } from '../../../Shared/Infrastructure/Validation';
import {
  CorpusAlreadyGeneratingError,
  CorpusRunLock,
} from '../../Application/CorpusRunLock';
import { GenerateCvCorpusUseCase } from '../../Application/GenerateCvCorpusUseCase';

@Controller('cvs')
export class GenerateCvCorpusAction {
  constructor(
    private readonly useCase: GenerateCvCorpusUseCase,
    private readonly lock: CorpusRunLock,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(LoggerId) private readonly logger: Logger,
  ) {}

  /**
   * Streams the run rather than returning when it finishes: thirty CVs takes
   * minutes on a free tier, and a multi-minute spinner is not an acceptable
   * answer to a button press.
   *
   * A second POST while a run is active is rejected before the stream opens, so
   * a double-clicked button cannot double the corpus.
   */
  @Post('generate')
  handle(
    @Body(new ZodValidationPipe(GenerateCorpusRequestSchema))
    body: GenerateCorpusRequestDto,
    @Res() response: Response,
  ): void {
    try {
      this.lock.acquire();
    } catch (error: unknown) {
      // Mapped here rather than thrown as an HTTP error by the lock: the
      // Application layer states the rule, and Infrastructure decides what that
      // means over HTTP. A 409 with a readable message beats doubling the
      // corpus because someone double-clicked.
      if (error instanceof CorpusAlreadyGeneratingError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }

    const seed = body.seed ?? this.config.generation.seed;

    this.logger.info('Corpus generation requested', {
      size: body.size,
      seed,
      force: body.force,
    });

    pipeEventStream(
      response,
      this.useCase
        .execute({ size: body.size, seed, force: body.force })
        // Released however the stream ends — completed, errored, or unsubscribed
        // because the client closed the tab. A lock that leaks on disconnect
        // would need an API restart to clear.
        .pipe(finalize(() => this.lock.release())),
      this.logger,
    );
  }
}
