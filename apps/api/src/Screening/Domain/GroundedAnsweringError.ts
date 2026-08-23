import { BaseError } from '../../Shared/Domain';

/**
 * The answerer gave up mid-stream. Never HTTP-carrying: by the time this can
 * happen the SSE stream is already open, so the use case turns it into a
 * single `error` frame rather than an HTTP status.
 */
export class GroundedAnsweringError extends BaseError {
  private constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }

  static forTransportFailure(cause: unknown): GroundedAnsweringError {
    const detail = cause instanceof Error ? cause.message : String(cause);

    return new GroundedAnsweringError(`Answering failed: ${detail}`, cause);
  }

  static forUnusableResponse(detail: string): GroundedAnsweringError {
    return new GroundedAnsweringError(
      `The model's response could not be used: ${detail}`,
    );
  }
}
