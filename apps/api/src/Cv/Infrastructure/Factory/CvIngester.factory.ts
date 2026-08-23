import type { Provider } from '@nestjs/common';
import { CvIngester } from '../../Application/CvIngester';
import { CvRepositoryId, type CvRepository } from '../../Domain/CvRepository';
import { EmbedderId, type Embedder } from '../../Domain/Embedder';
import {
  TextExtractorId,
  type TextExtractor,
} from '../../Domain/TextExtractor';
import { LoggerId, type Logger } from '../../../Shared/Domain';
import {
  APP_CONFIG,
  type AppConfig,
} from '../../../Shared/Infrastructure/Config';

export const CvIngesterFactory: Provider = {
  provide: CvIngester,
  useFactory: (
    extractor: TextExtractor,
    embedder: Embedder,
    repository: CvRepository,
    config: AppConfig,
    logger: Logger,
  ): CvIngester =>
    new CvIngester(
      extractor,
      embedder,
      repository,
      config.storageDir,
      config.embedding.dimensions,
      logger,
    ),
  inject: [TextExtractorId, EmbedderId, CvRepositoryId, APP_CONFIG, LoggerId],
};
