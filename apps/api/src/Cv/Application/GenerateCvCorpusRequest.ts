export interface GenerateCvCorpusRequest {
  readonly size: number;
  readonly seed: number;
  /**
   * Regenerate candidates that already exist. Off by default, which is what
   * makes re-running the same request a resume rather than a duplicate.
   */
  readonly force: boolean;
  /**
   * Overrides the configured batch size for one run. Exists for the CLI, where
   * trying different pacing should not mean editing `.env`.
   */
  readonly batchSize?: number;
}
