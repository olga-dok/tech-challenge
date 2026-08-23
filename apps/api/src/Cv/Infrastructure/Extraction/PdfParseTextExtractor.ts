import { stat, readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import type { Logger } from '../../../Shared/Domain';
import type {
  ExtractedDocument,
  TextExtractionFailureReason,
  TextExtractionResult,
  TextExtractor,
} from '../../Domain/TextExtractor';

export const DEFAULT_MAX_PDF_BYTES = 20 * 1024 * 1024;

const PDF_MAGIC = '%PDF';

/**
 * Never throws for bad input — a corrupt or oversized PDF is routine among
 * thirty generated CVs, so every failure mode the plan calls out becomes a
 * value the caller can log and skip past, not an exception that aborts the
 * whole ingestion run.
 */
export class PdfParseTextExtractor implements TextExtractor {
  private readonly logger?: Logger;

  constructor(
    private readonly maxBytes: number = DEFAULT_MAX_PDF_BYTES,
    logger?: Logger,
  ) {
    this.logger = logger?.forContext('PdfParseTextExtractor');
  }

  async extract(pdfPath: string): Promise<TextExtractionResult> {
    const size = (await stat(pdfPath)).size;
    if (size > this.maxBytes) {
      return this.failure(
        pdfPath,
        'oversize',
        `${String(size)} bytes exceeds the ${String(this.maxBytes)}-byte cap`,
      );
    }

    const bytes = await readFile(pdfPath);
    if (bytes.subarray(0, PDF_MAGIC.length).toString('latin1') !== PDF_MAGIC) {
      return this.failure(pdfPath, 'non-pdf', 'missing %PDF magic bytes');
    }

    const parser = new PDFParse({ data: bytes });

    let document: ExtractedDocument;
    try {
      // pageJoiner defaults to a "-- N of M --" boilerplate marker that would
      // make an image-only, text-free page look non-empty.
      const result = await parser.getText({ pageJoiner: '' });
      document = {
        pages: result.pages.map((page) => page.text),
        rawText: result.text,
      };
    } catch (error: unknown) {
      return this.failure(
        pdfPath,
        'parse-failed',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      await parser.destroy();
    }

    if (document.rawText.trim().length === 0) {
      return this.failure(pdfPath, 'empty-text', 'no extractable text');
    }

    return { succeeded: true, document };
  }

  private failure(
    pdfPath: string,
    reason: TextExtractionFailureReason,
    detail: string,
  ): TextExtractionResult {
    this.logger?.warn('PDF extraction failed', { pdfPath, reason, detail });

    return { succeeded: false, failure: { reason, detail } };
  }
}
