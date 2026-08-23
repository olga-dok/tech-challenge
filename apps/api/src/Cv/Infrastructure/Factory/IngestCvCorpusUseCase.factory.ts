import type { Provider } from '@nestjs/common';
import { CorpusIngesterId } from '../../Application/CorpusIngester';
import { CvIngester } from '../../Application/CvIngester';
import { IngestCvCorpusUseCase } from '../../Application/IngestCvCorpusUseCase';
import { CvRepositoryId, type CvRepository } from '../../Domain/CvRepository';
import { LoggerId, type Logger } from '../../../Shared/Domain';

export const IngestCvCorpusUseCaseFactory: Provider = {
  provide: IngestCvCorpusUseCase,
  useFactory: (
    repository: CvRepository,
    ingester: CvIngester,
    logger: Logger,
  ): IngestCvCorpusUseCase =>
    new IngestCvCorpusUseCase(repository, ingester, { logger }),
  inject: [CvRepositoryId, CvIngester, LoggerId],
};

/**
 * `GenerateCvCorpusUseCase` depends on the `CorpusIngester` port, not this
 * class directly, so generation stays ignorant of how ingestion is built.
 * Bound to the same instance the class token resolves, not a second
 * construction of it.
 */
export const CorpusIngesterFactory: Provider = {
  provide: CorpusIngesterId,
  useExisting: IngestCvCorpusUseCase,
};
