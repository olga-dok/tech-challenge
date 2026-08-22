/**
 * Turns text into vectors. Two methods rather than one because the default
 * model is an E5, and E5 models are trained with asymmetric prefixes — a
 * passage embedded as a query retrieves measurably worse. Callers should not
 * have to know that, so the port names the intent instead.
 */
export interface Embedder {
  /**
   * The width this embedder produces. Ingestion asserts it against the pgvector
   * column at startup: writing 384-wide vectors into a 1536-wide column is a
   * miserable bug to find weeks later.
   */
  readonly dimensions: number;

  /** Documents to be indexed. */
  embed(texts: readonly string[]): Promise<number[][]>;

  /** A single search query. */
  embedQuery(text: string): Promise<number[]>;
}

export const EmbedderId = Symbol('Embedder');
