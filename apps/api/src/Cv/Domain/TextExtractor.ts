export interface ExtractedDocument {
  readonly pages: readonly string[];
  readonly rawText: string;
}

export type TextExtractionFailureReason =
  'non-pdf' | 'oversize' | 'empty-text' | 'parse-failed';

export interface TextExtractionFailure {
  readonly reason: TextExtractionFailureReason;
  readonly detail: string;
}

export type TextExtractionResult =
  | { readonly succeeded: true; readonly document: ExtractedDocument }
  | { readonly succeeded: false; readonly failure: TextExtractionFailure };

/**
 * Never throws for bad input. A corrupt or oversized PDF is routine input for
 * ingestion (one bad file among thirty), so failure is a value the caller
 * reports and continues past, not an exception that would abort the batch.
 */
export interface TextExtractor {
  extract(pdfPath: string): Promise<TextExtractionResult>;
}

export const TextExtractorId = Symbol('TextExtractor');
