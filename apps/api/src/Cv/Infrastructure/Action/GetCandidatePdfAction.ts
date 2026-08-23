import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { SlugSchema } from '@repo/contracts';
import type { Response } from 'express';
import {
  APP_CONFIG,
  type AppConfig,
} from '../../../Shared/Infrastructure/Config';
import { ZodValidationPipe } from '../../../Shared/Infrastructure/Validation';
import { GetCandidateUseCase } from '../../Application/GetCandidateUseCase';
import { CandidateNotFoundError } from '../../Domain/CandidateNotFoundError';
import { Slug } from '../../Domain/Slug';

// Duck-typed on `.code` rather than `instanceof Error`: Node's own advice for
// system errors, and the only check that works reliably here regardless of
// which realm constructed the error object.
const isFileNotFound = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'ENOENT';

@Controller('cvs')
export class GetCandidatePdfAction {
  constructor(
    private readonly useCase: GetCandidateUseCase,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get(':slug/pdf')
  async handle(
    @Param('slug', new ZodValidationPipe(SlugSchema)) slugValue: string,
    @Res() response: Response,
  ): Promise<void> {
    let path: string;

    try {
      const candidate = await this.useCase.execute(Slug.from(slugValue));
      path = join(this.config.storageDir, candidate.files.pdfPath);
      await stat(path);
    } catch (error: unknown) {
      if (error instanceof CandidateNotFoundError || isFileNotFound(error)) {
        throw new NotFoundException('No PDF found for that candidate');
      }

      throw error;
    }

    response.setHeader('Content-Type', 'application/pdf');
    createReadStream(path).pipe(response);
  }
}
