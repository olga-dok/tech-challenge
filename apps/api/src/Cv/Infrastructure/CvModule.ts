import { Module } from '@nestjs/common';
import { HttpModule } from '../../Shared/Infrastructure/Http';
import { PrismaModule } from '../../Shared/Infrastructure/Prisma';
import { CorpusIngesterId } from '../Application/CorpusIngester';
import { CorpusRunLock } from '../Application/CorpusRunLock';
import { CvIngester } from '../Application/CvIngester';
import { GenerateCvCorpusUseCase } from '../Application/GenerateCvCorpusUseCase';
import { GetCandidateUseCase } from '../Application/GetCandidateUseCase';
import { GetCorpusStatsUseCase } from '../Application/GetCorpusStatsUseCase';
import { IngestCvCorpusUseCase } from '../Application/IngestCvCorpusUseCase';
import { ListCandidatesUseCase } from '../Application/ListCandidatesUseCase';
import { CvRepositoryId } from '../Domain/CvRepository';
import { CvStorageId } from '../Domain/CvStorage';
import { EmbedderId } from '../Domain/Embedder';
import { PdfRendererId } from '../Domain/PdfRenderer';
import { PortraitPainterId } from '../Domain/PortraitPainter';
import { ProfileDrafterId } from '../Domain/ProfileDrafter';
import { TextExtractorId } from '../Domain/TextExtractor';
import { GenerateCvCorpusAction } from './Action/GenerateCvCorpusAction';
import { GetCandidateAction } from './Action/GetCandidateAction';
import { GetCandidatePdfAction } from './Action/GetCandidatePdfAction';
import { GetCandidatePortraitAction } from './Action/GetCandidatePortraitAction';
import { GetCorpusStatsAction } from './Action/GetCorpusStatsAction';
import { IngestCvCorpusAction } from './Action/IngestCvCorpusAction';
import { ListCandidatesAction } from './Action/ListCandidatesAction';
import { CorpusRunLockFactory } from './Factory/CorpusRunLock.factory';
import { CvIngesterFactory } from './Factory/CvIngester.factory';
import { CvRepositoryFactory } from './Factory/CvRepository.factory';
import { CvStorageFactory } from './Factory/CvStorage.factory';
import { EmbedderFactory } from './Factory/Embedder.factory';
import { GenerateCvCorpusUseCaseFactory } from './Factory/GenerateCvCorpusUseCase.factory';
import { GetCandidateUseCaseFactory } from './Factory/GetCandidateUseCase.factory';
import { GetCorpusStatsUseCaseFactory } from './Factory/GetCorpusStatsUseCase.factory';
import {
  CorpusIngesterFactory,
  IngestCvCorpusUseCaseFactory,
} from './Factory/IngestCvCorpusUseCase.factory';
import { ListCandidatesUseCaseFactory } from './Factory/ListCandidatesUseCase.factory';
import { PdfRendererFactory } from './Factory/PdfRenderer.factory';
import { PortraitPainterFactory } from './Factory/PortraitPainter.factory';
import { ProfileDrafterFactory } from './Factory/ProfileDrafter.factory';
import { TextExtractorFactory } from './Factory/TextExtractor.factory';

/** The CV context: generation, ingestion, and the candidate read API. */
@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [
    GenerateCvCorpusAction,
    IngestCvCorpusAction,
    ListCandidatesAction,
    GetCandidateAction,
    GetCandidatePortraitAction,
    GetCandidatePdfAction,
    GetCorpusStatsAction,
  ],
  providers: [
    ProfileDrafterFactory,
    EmbedderFactory,
    PortraitPainterFactory,
    PdfRendererFactory,
    TextExtractorFactory,
    CvRepositoryFactory,
    CvStorageFactory,
    CorpusRunLockFactory,
    CvIngesterFactory,
    IngestCvCorpusUseCaseFactory,
    CorpusIngesterFactory,
    GenerateCvCorpusUseCaseFactory,
    ListCandidatesUseCaseFactory,
    GetCandidateUseCaseFactory,
    GetCorpusStatsUseCaseFactory,
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
    CvIngester,
    IngestCvCorpusUseCase,
    CorpusIngesterId,
    ListCandidatesUseCase,
    GetCandidateUseCase,
    GetCorpusStatsUseCase,
  ],
})
export class CvModule {}
