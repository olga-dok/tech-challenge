export interface IngestCvCorpusRequest {
  /**
   * Re-embed every candidate even if its content hash is unchanged. Off by
   * default, which is what makes re-running ingestion on an unchanged corpus
   * cost zero embedding work.
   */
  readonly force?: boolean;
}
