import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
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

// The reverse of FileSystemCvStorage's extension map: one is written at
// generation time from a MIME type, this is read back from the extension it
// chose. Not shared — the two run at opposite ends of the pipeline.
const PORTRAIT_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

// Duck-typed on `.code` rather than `instanceof Error`: Node's own advice for
// system errors, and the only check that works reliably here regardless of
// which realm constructed the error object.
const isFileNotFound = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'ENOENT';

@Controller('cvs')
export class GetCandidatePortraitAction {
  constructor(
    private readonly useCase: GetCandidateUseCase,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get(':slug/portrait')
  async handle(
    @Param('slug', new ZodValidationPipe(SlugSchema)) slugValue: string,
    @Res() response: Response,
  ): Promise<void> {
    let path: string;

    try {
      const candidate = await this.useCase.execute(Slug.from(slugValue));
      path = join(this.config.storageDir, candidate.files.portraitPath);
      await stat(path);
    } catch (error: unknown) {
      if (error instanceof CandidateNotFoundError || isFileNotFound(error)) {
        throw new NotFoundException('No portrait found for that candidate');
      }

      throw error;
    }

    response.setHeader(
      'Content-Type',
      PORTRAIT_MIME_TYPES[extname(path)] ?? 'application/octet-stream',
    );
    // Portraits never change once generated, so a client or CDN can cache
    // them forever rather than re-checking on every gallery render.
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    createReadStream(path).pipe(response);
  }
}
