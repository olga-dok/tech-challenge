export type NodeEnv = 'development' | 'test' | 'production';

export interface LlmConfig {
  readonly provider: 'gemini' | 'openrouter';
  readonly apiKey: string;
  readonly textModel: string;
}

export interface EmbeddingConfig {
  readonly provider: 'local' | 'gemini';
  readonly model: string;
  readonly dimensions: number;
  readonly apiKey: string | null;
}

export interface PortraitConfig {
  readonly provider: 'pollinations' | 'gemini' | 'huggingface' | 'svg';
  readonly model: string | null;
  readonly apiKey: string | null;
}

export interface GenerationConfig {
  /**
   * CVs per batch, and therefore the parallelism: a batch runs concurrently,
   * every member settles, then the pipeline pauses and starts the next one.
   * Deliberately a single dial — a separate concurrency setting would overlap
   * with this one and make neither predictable.
   */
  readonly batchSize: number;
  /** Pause between batches. Guards a per-minute quota, which parallelism caps alone do not. */
  readonly batchDelayMs: number;
  /** Multiplier applied to the delay after a rate-limited batch. */
  readonly batchBackoffFactor: number;
  readonly maxBatchDelayMs: number;
  readonly defaultCorpusSize: number;
  readonly seed: number;
}

export interface ObservabilityConfig {
  readonly enabled: boolean;
  readonly publicKey: string | null;
  readonly secretKey: string | null;
  readonly baseUrl: string;
}

export interface AppConfig {
  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly databaseUrl: string;
  readonly storageDir: string;
  readonly llm: LlmConfig;
  readonly embedding: EmbeddingConfig;
  readonly portrait: PortraitConfig;
  readonly generation: GenerationConfig;
  readonly observability: ObservabilityConfig;
}

export const APP_CONFIG = Symbol('AppConfig');
