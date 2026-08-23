import { Body, Controller, Inject, Post, Res } from '@nestjs/common';
import {
  IngestCorpusRequestSchema,
  type IngestCorpusRequestDto,
} from '@repo/contracts';
import type { Response } from 'express';
import { finalize } from 'rxjs';
import { LoggerId, type Logger } from '../../../Shared/Domain';
import { pipeEventStream } from '../../../Shared/Infrastructure/Sse';
import { ZodValidationPipe } from '../../../Shared/Infrastructure/Validation';
import { CorpusRunLock } from '../../Application/CorpusRunLock';
import { IngestCvCorpusUseCase } from '../../Application/IngestCvCorpusUseCase';

@Controller('cvs')
export class IngestCvCorpusAction {
  constructor(
    private readonly useCase: IngestCvCorpusUseCase,
    private readonly lock: CorpusRunLock,
    @Inject(LoggerId) private readonly logger: Logger,
  ) {}

  /**
   * Re-indexes the corpus without regenerating it — for when only the
   * chunking or embedding strategy changed.
   *
   * Shares `CorpusRunLock` with generation: both mutate the same Candidate/
   * CvChunk rows, so a manual re-index while a generation run is chaining
   * into its own ingestion would otherwise race over the same tables.
   */
  @Post('ingest')
  handle(
    @Body(new ZodValidationPipe(IngestCorpusRequestSchema))
    body: IngestCorpusRequestDto,
    @Res() response: Response,
  ): void {
    this.lock.acquire();

    this.logger.info('Corpus ingestion requested', { force: body.force });

    pipeEventStream(
      response,
      this.useCase
        .ingest({ force: body.force })
        .pipe(finalize(() => this.lock.release())),
      this.logger,
    );
  }
}
