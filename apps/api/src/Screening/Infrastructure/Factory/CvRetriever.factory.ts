import type { Provider } from '@nestjs/common';
import { EmbedderId, type Embedder } from '../../../Cv/Domain/Embedder';
import { LoggerId, type Logger } from '../../../Shared/Domain';
import { PrismaConnection } from '../../../Shared/Infrastructure/Prisma';
import { CvRetrieverId } from '../../Domain/CvRetriever';
import { HybridCvRetriever } from '../HybridCvRetriever';

export const CvRetrieverFactory: Provider = {
  provide: CvRetrieverId,
  useFactory: (
    embedder: Embedder,
    prisma: PrismaConnection,
    logger: Logger,
  ): HybridCvRetriever => new HybridCvRetriever(embedder, prisma, logger),
  inject: [EmbedderId, PrismaConnection, LoggerId],
};
