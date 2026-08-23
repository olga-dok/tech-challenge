import { Module } from '@nestjs/common';
import { CvModule } from '../../Cv/Infrastructure/CvModule';
import { PrismaModule } from '../../Shared/Infrastructure/Prisma';
import { CvRetrieverId } from '../Domain/CvRetriever';
import { CvRetrieverFactory } from './Factory/CvRetriever.factory';

/**
 * The Screening context: retrieval today, grounded answering as it lands.
 * Depends on `CvModule` for the embedder port and reads `Cv`'s tables
 * directly for the hybrid SQL arms — a deliberate cross-context read in a
 * single-Postgres monolith, never a write.
 */
@Module({
  imports: [PrismaModule, CvModule],
  providers: [CvRetrieverFactory],
  exports: [CvRetrieverId],
})
export class ScreeningModule {}
