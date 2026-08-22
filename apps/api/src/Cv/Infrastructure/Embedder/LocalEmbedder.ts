import { join } from 'node:path';
import type { EmbeddingConfig } from '../../../Shared/Infrastructure/Config';
import type { Logger } from '../../../Shared/Domain';
import type { Embedder } from '../../Domain/Embedder';
import { EmbeddingFailedError } from '../../Domain/EmbeddingFailedError';

/**
 * What one call to the model looks like, narrow enough that tests can stand in
 * for the real pipeline without loading 120MB of ONNX.
 */
export type FeatureExtractor = (
  texts: string[],
) => Promise<{ vectors: number[][] }>;

export type ExtractorLoader = () => Promise<FeatureExtractor>;

/**
 * Embeddings computed in-process, and the most consequential free-tier decision
 * in the project.
 *
 * Thirty CVs is roughly 360 passage embeddings plus one per question — exactly
 * the volume at which a free hosted tier starts refusing mid-demo. Locally there
 * is no quota and no network, so re-indexing costs nothing, which is what makes
 * iterating on the chunking strategy affordable at all. The price is a smaller
 * model; the evaluation harness measures that against a hosted one rather than
 * assuming it away.
 *
 * E5 models are trained asymmetrically: passages and queries carry different
 * prefixes, and mixing them up costs real recall. That is why the port has two
 * methods and why the prefixes live here rather than in calling code.
 */
export class LocalEmbedder implements Embedder {
  private extractor: Promise<FeatureExtractor> | null = null;
  private readonly logger?: Logger;

  constructor(
    private readonly config: EmbeddingConfig,
    private readonly storageDir: string,
    private readonly loadExtractor: ExtractorLoader = () =>
      loadTransformersExtractor(config.model, join(storageDir, 'models')),
    logger?: Logger,
  ) {
    this.logger = logger?.forContext('LocalEmbedder');
  }

  get dimensions(): number {
    return this.config.dimensions;
  }

  async embed(texts: readonly string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    return this.run(texts.map((text) => `passage: ${text}`));
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.run([`query: ${text}`]);

    return vector;
  }

  private async run(prefixed: string[]): Promise<number[][]> {
    const extractor = await this.load();

    let vectors: number[][];
    try {
      ({ vectors } = await extractor(prefixed));
    } catch (error: unknown) {
      throw EmbeddingFailedError.forProviderFailure(this.config.model, error);
    }

    if (vectors.length !== prefixed.length) {
      throw EmbeddingFailedError.forBatchMismatch(
        prefixed.length,
        vectors.length,
      );
    }

    // Checked on every call rather than once at load: it is a constant-time
    // comparison, and a wrong-width vector reaching the pgvector column is the
    // kind of bug that only surfaces as bad search results weeks later.
    for (const vector of vectors) {
      if (vector.length !== this.config.dimensions) {
        throw EmbeddingFailedError.forDimensionMismatch(
          this.config.model,
          this.config.dimensions,
          vector.length,
        );
      }
    }

    return vectors;
  }

  private load(): Promise<FeatureExtractor> {
    // Loaded once for the life of the process: the first call pays ~45s of
    // download and warm-up, and paying it per chunk would make ingestion
    // unusable. Assigned before awaiting so concurrent callers share the load.
    this.extractor ??= this.loadExtractor().then((extractor) => {
      this.logger?.info('Local embedding model ready', {
        model: this.config.model,
        dimensions: this.config.dimensions,
      });

      return extractor;
    });

    return this.extractor;
  }
}

/**
 * The real loader, kept out of the class so the class stays unit-testable.
 *
 * `transformers.js` otherwise caches models inside its own `node_modules`
 * directory, where a reinstall silently throws away a 120MB download; pointing
 * it at the storage directory keeps it with the rest of the generated artefacts.
 */
async function loadTransformersExtractor(
  model: string,
  cacheDir: string,
): Promise<FeatureExtractor> {
  const { env, pipeline } = await import('@huggingface/transformers');
  env.cacheDir = cacheDir;

  const extractor = await pipeline('feature-extraction', `Xenova/${model}`);

  return async (texts: string[]) => {
    // Mean pooling and L2 normalisation are what make these vectors comparable
    // with cosine distance, which is the operator the HNSW index was built for.
    const output = await extractor(texts, { pooling: 'mean', normalize: true });

    return { vectors: output.tolist() as number[][] };
  };
}
