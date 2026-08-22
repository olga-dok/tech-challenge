import type { Logger } from '../../Domain';
import { RetryableError } from './RetryableError';

export interface RetryOptions {
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  /** Injected so tests neither sleep nor depend on wall-clock timing. */
  readonly sleep?: (ms: number) => Promise<void>;
  readonly random?: () => number;
  readonly logger?: Logger;
  readonly label?: string;
}

const DEFAULTS = {
  maxAttempts: 4,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
} as const;

/**
 * A `Retry-After` longer than this is treated as "come back later" rather than
 * honoured: blocking a generation run for ten minutes is worse than dropping
 * one CV, which the batch pipeline is built to survive.
 */
const MAX_HONOURED_RETRY_AFTER_MS = 60_000;

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Exponential backoff with full jitter, for the free tiers this whole project
 * runs on. They rate-limit aggressively and without warning, and this is what
 * turns a 429 halfway through thirty CVs into a pause instead of a failure.
 *
 * Jitter is not decoration: a batch of five requests that all fail together
 * would otherwise retry in lockstep and get rate-limited together, forever.
 */
export async function withRetry<TResult>(
  operation: (attempt: number) => Promise<TResult>,
  options: RetryOptions = {},
): Promise<TResult> {
  const maxAttempts = options.maxAttempts ?? DEFAULTS.maxAttempts;
  const baseDelayMs = options.baseDelayMs ?? DEFAULTS.baseDelayMs;
  const maxDelayMs = options.maxDelayMs ?? DEFAULTS.maxDelayMs;
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error: unknown) {
      if (!(error instanceof RetryableError) || attempt >= maxAttempts) {
        throw error;
      }

      const delayMs = nextDelayMs({
        attempt,
        baseDelayMs,
        maxDelayMs,
        retryAfterMs: error.retryAfterMs,
        random,
      });

      options.logger?.warn('Retrying after a recoverable failure', {
        label: options.label ?? 'request',
        attempt,
        of: maxAttempts,
        delayMs,
        status: error.status,
      });

      await sleep(delayMs);
    }
  }
}

function nextDelayMs(input: {
  attempt: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryAfterMs: number | null;
  random: () => number;
}): number {
  // An explicit Retry-After wins over our own guess — the service knows when its
  // window reopens, and ignoring it just burns another attempt.
  if (input.retryAfterMs !== null) {
    return Math.min(input.retryAfterMs, MAX_HONOURED_RETRY_AFTER_MS);
  }

  const exponential = Math.min(
    input.maxDelayMs,
    input.baseDelayMs * 2 ** (input.attempt - 1),
  );

  // Full jitter: anywhere in (0, exponential]. Keeps a batch that failed
  // together from retrying together.
  return Math.max(1, Math.round(exponential * input.random()));
}

export function parseRetryAfter(header: string | null): number | null {
  if (header === null || header.trim().length === 0) {
    return null;
  }

  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1_000);
  }

  // The header may also be an HTTP date.
  const until = Date.parse(header);

  return Number.isNaN(until) ? null : Math.max(0, until - Date.now());
}
