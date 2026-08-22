import { BaseError } from '../../Domain';

/**
 * "Try me again" — the only thing `withRetry` acts on.
 *
 * Retryability is decided where the failure is understood (an adapter reading a
 * status code), not guessed by the retry helper from an error message. Anything
 * else thrown inside a retried operation propagates on the first attempt, which
 * is what keeps a 400 from being asked four times.
 */
export class RetryableError extends BaseError {
  /**
   * Marks a quota refusal for anyone up the stack.
   *
   * The generation pipeline has to tell "the free tier said slow down" from
   * "this request was wrong": the first means pace yourself and report waiting,
   * the second means report a failure. It cannot read HTTP status codes from the
   * Application layer, so the status is translated into this flag here and read
   * back by `isRateLimited`.
   */
  readonly rateLimited: boolean;

  private constructor(
    message: string,
    readonly status: number | null,
    /** From `Retry-After`, when the service told us how long to wait. */
    readonly retryAfterMs: number | null,
    readonly cause?: unknown,
  ) {
    super(message);
    this.rateLimited = status === 429;
  }

  static fromStatus(
    status: number,
    detail: string,
    retryAfterMs: number | null = null,
  ): RetryableError {
    return new RetryableError(
      `Request failed with ${String(status)}: ${detail}`,
      status,
      retryAfterMs,
    );
  }

  static fromTransport(cause: unknown): RetryableError {
    const detail = cause instanceof Error ? cause.message : String(cause);

    return new RetryableError(
      `Request did not complete: ${detail}`,
      null,
      null,
      cause,
    );
  }
}
