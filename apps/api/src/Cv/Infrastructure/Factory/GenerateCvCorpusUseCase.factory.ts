import type { Provider } from '@nestjs/common';
import { LoggerId, type Logger } from '../../../Shared/Domain';
import {
  APP_CONFIG,
  type AppConfig,
} from '../../../Shared/Infrastructure/Config';
import {
  CorpusIngesterId,
  type CorpusIngester,
} from '../../Application/CorpusIngester';
import { GenerateCvCorpusUseCase } from '../../Application/GenerateCvCorpusUseCase';
import { CvRepositoryId, type CvRepository } from '../../Domain/CvRepository';
import { CvStorageId, type CvStorage } from '../../Domain/CvStorage';
import { PdfRendererId, type PdfRenderer } from '../../Domain/PdfRenderer';
import {
  PortraitPainterId,
  type PortraitPainter,
} from '../../Domain/PortraitPainter';
import {
  ProfileDrafterId,
  type ProfileDrafter,
} from '../../Domain/ProfileDrafter';

export const GenerateCvCorpusUseCaseFactory: Provider = {
  provide: GenerateCvCorpusUseCase,
  useFactory: (
    repository: CvRepository,
    drafter: ProfileDrafter,
    painter: PortraitPainter,
    renderer: PdfRenderer,
    storage: CvStorage,
    config: AppConfig,
    logger: Logger,
    ingester: CorpusIngester,
  ): GenerateCvCorpusUseCase =>
    new GenerateCvCorpusUseCase(
      repository,
      drafter,
      painter,
      renderer,
      storage,
      {
        batchSize: config.generation.batchSize,
        pacing: {
          batchDelayMs: config.generation.batchDelayMs,
          batchBackoffFactor: config.generation.batchBackoffFactor,
          maxBatchDelayMs: config.generation.maxBatchDelayMs,
        },
        logger,
        ingester,
      },
    ),
  inject: [
    CvRepositoryId,
    ProfileDrafterId,
    PortraitPainterId,
    PdfRendererId,
    CvStorageId,
    APP_CONFIG,
    LoggerId,
    CorpusIngesterId,
  ],
};
