import { Module } from '@nestjs/common';
import { HttpModule } from '../../Shared/Infrastructure/Http';
import { EmbedderId } from '../Domain/Embedder';
import { PortraitPainterId } from '../Domain/PortraitPainter';
import { ProfileDrafterId } from '../Domain/ProfileDrafter';
import { EmbedderFactory } from './Factory/Embedder.factory';
import { PortraitPainterFactory } from './Factory/PortraitPainter.factory';
import { ProfileDrafterFactory } from './Factory/ProfileDrafter.factory';

/**
 * The CV context's wiring. Only the AI adapters so far — use cases, actions and
 * persistence join as they land.
 */
@Module({
  imports: [HttpModule],
  providers: [ProfileDrafterFactory, EmbedderFactory, PortraitPainterFactory],
  exports: [ProfileDrafterId, EmbedderId, PortraitPainterId],
})
export class CvModule {}
