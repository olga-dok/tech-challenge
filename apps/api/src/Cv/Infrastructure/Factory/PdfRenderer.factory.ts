import type { Provider } from '@nestjs/common';
import { LoggerId, type Logger } from '../../../Shared/Domain';
import { PdfRendererId, type PdfRenderer } from '../../Domain/PdfRenderer';
import { PuppeteerPdfRenderer } from '../PuppeteerPdfRenderer';

export const PdfRendererFactory: Provider = {
  provide: PdfRendererId,
  useFactory: (logger: Logger): PdfRenderer =>
    new PuppeteerPdfRenderer(undefined, logger),
  inject: [LoggerId],
};
