import type { Provider } from '@nestjs/common';
import { LoggerId, type Logger } from '../../../Shared/Domain';
import {
  TextExtractorId,
  type TextExtractor,
} from '../../Domain/TextExtractor';
import { PdfParseTextExtractor } from '../Extraction/PdfParseTextExtractor';

export const TextExtractorFactory: Provider = {
  provide: TextExtractorId,
  useFactory: (logger: Logger): TextExtractor =>
    new PdfParseTextExtractor(undefined, logger),
  inject: [LoggerId],
};
