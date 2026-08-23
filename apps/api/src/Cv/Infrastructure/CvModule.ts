import { Module } from '@nestjs/common';
import { HttpModule } from '../../Shared/Infrastructure/Http';
import { PrismaModule } from '../../Shared/Infrastructure/Prisma';
import { CorpusRunLock } from '../Application/CorpusRunLock';
import { GenerateCvCorpusUseCase } from '../Application/GenerateCvCorpusUseCase';
import { CvRepositoryId } from '../Domain/CvRepository';
import { CvStorageId } from '../Domain/CvStorage';
import { EmbedderId } from '../Domain/Embedder';
import { PdfRendererId } from '../Domain/PdfRenderer';
import { PortraitPainterId } from '../Domain/PortraitPainter';
import { ProfileDrafterId } from '../Domain/ProfileDrafter';
import { TextExtractorId } from '../Domain/TextExtractor';
import { GenerateCvCorpusAction } from './Action/GenerateCvCorpusAction';
import { CorpusRunLockFactory } from './Factory/CorpusRunLock.factory';
import { CvRepositoryFactory } from './Factory/CvRepository.factory';
import { CvStorageFactory } from './Factory/CvStorage.factory';
import { EmbedderFactory } from './Factory/Embedder.factory';
import { GenerateCvCorpusUseCaseFactory } from './Factory/GenerateCvCorpusUseCase.factory';
import { PdfRendererFactory } from './Factory/PdfRenderer.factory';
import { PortraitPainterFactory } from './Factory/PortraitPainter.factory';
import { ProfileDrafterFactory } from './Factory/ProfileDrafter.factory';
import { TextExtractorFactory } from './Factory/TextExtractor.factory';

/** The CV context: generation today, ingestion and the read API as they land. */
@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [GenerateCvCorpusAction],
  providers: [
    ProfileDrafterFactory,
    EmbedderFactory,
    PortraitPainterFactory,
    PdfRendererFactory,
    TextExtractorFactory,
    CvRepositoryFactory,
    CvStorageFactory,
    CorpusRunLockFactory,
    GenerateCvCorpusUseCaseFactory,
  ],
  exports: [
    ProfileDrafterId,
    EmbedderId,
    PortraitPainterId,
    PdfRendererId,
    TextExtractorId,
    CvRepositoryId,
    CvStorageId,
    GenerateCvCorpusUseCase,
    CorpusRunLock,
  ],
})
export class CvModule {}
