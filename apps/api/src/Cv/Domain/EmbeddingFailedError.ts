import { BaseError } from '../../Shared/Domain';

export class EmbeddingFailedError extends BaseError {
  private constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }

  static forDimensionMismatch(
    model: string,
    expected: number,
    actual: number,
  ): EmbeddingFailedError {
    return new EmbeddingFailedError(
      `${model} produced ${String(actual)}-dimension vectors but the schema expects ${String(expected)}. The pgvector column width is fixed by migration, so this is a migration, not a config change.`,
    );
  }

  static forProviderFailure(
    model: string,
    cause: unknown,
  ): EmbeddingFailedError {
    const detail = cause instanceof Error ? cause.message : String(cause);

    return new EmbeddingFailedError(
      `Embedding with ${model} failed: ${detail}`,
      cause,
    );
  }

  static forBatchMismatch(
    expected: number,
    actual: number,
  ): EmbeddingFailedError {
    return new EmbeddingFailedError(
      `Asked for ${String(expected)} embeddings and got ${String(actual)} back; refusing to guess which chunk is which`,
    );
  }
}
