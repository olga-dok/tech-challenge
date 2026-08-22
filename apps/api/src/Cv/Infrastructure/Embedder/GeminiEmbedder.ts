import { z } from 'zod';
import type { EmbeddingConfig } from '../../../Shared/Infrastructure/Config';
import type { HttpTransport } from '../../../Shared/Infrastructure/Http';
import type { Embedder } from '../../Domain/Embedder';
import { EmbeddingFailedError } from '../../Domain/EmbeddingFailedError';

const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';

/** Gemini's own batch ceiling for this endpoint. */
const MAX_BATCH = 100;

const responseSchema = z.object({
  embeddings: z.array(z.object({ values: z.array(z.number()) })),
});

/**
 * The hosted comparison, kept behind the same port as the local embedder purely
 * so the evaluation harness can run the same golden set through both and say
 * what the free option costs in recall — rather than the README asserting it.
 *
 * `gemini-embedding-001` is natively 3072-wide and supports truncation via
 * `outputDimensionality`, which is what lets it fit a column sized for a
 * smaller model. Truncated vectors are no longer unit-length, so they are
 * renormalised here; skipping that quietly distorts every cosine distance.
 */
export class GeminiEmbedder implements Embedder {
  constructor(
    private readonly config: EmbeddingConfig,
    private readonly apiKey: string,
    private readonly transport: HttpTransport,
  ) {}

  get dimensions(): number {
    return this.config.dimensions;
  }

  async embed(texts: readonly string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const vectors: number[][] = [];

    for (let start = 0; start < texts.length; start += MAX_BATCH) {
      vectors.push(
        ...(await this.request(
          texts.slice(start, start + MAX_BATCH),
          'RETRIEVAL_DOCUMENT',
        )),
      );
    }

    return vectors;
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.request([text], 'RETRIEVAL_QUERY');

    return vector;
  }

  private async request(
    texts: readonly string[],
    taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
  ): Promise<number[][]> {
    let payload: unknown;

    try {
      payload = await this.transport.json({
        url: `${GEMINI_BASE_URL}/${this.config.model}:batchEmbedContents`,
        method: 'POST',
        headers: { 'x-goog-api-key': this.apiKey },
        body: {
          requests: texts.map((text) => ({
            model: `models/${this.config.model}`,
            content: { parts: [{ text }] },
            taskType,
            outputDimensionality: this.config.dimensions,
          })),
        },
        label: 'gemini:batchEmbedContents',
      });
    } catch (error: unknown) {
      throw EmbeddingFailedError.forProviderFailure(this.config.model, error);
    }

    const parsed = responseSchema.safeParse(payload);

    if (!parsed.success) {
      throw EmbeddingFailedError.forProviderFailure(
        this.config.model,
        new Error('the response contained no embeddings'),
      );
    }

    if (parsed.data.embeddings.length !== texts.length) {
      throw EmbeddingFailedError.forBatchMismatch(
        texts.length,
        parsed.data.embeddings.length,
      );
    }

    return parsed.data.embeddings.map(({ values }) => {
      if (values.length !== this.config.dimensions) {
        throw EmbeddingFailedError.forDimensionMismatch(
          this.config.model,
          this.config.dimensions,
          values.length,
        );
      }

      return normalise(values);
    });
  }
}

/** L2 normalisation, undoing the distortion truncation introduces. */
function normalise(vector: readonly number[]): number[] {
  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  );

  return magnitude === 0
    ? [...vector]
    : vector.map((value) => value / magnitude);
}
