import { RetryableError } from '../../../../../src/Shared/Infrastructure/Http/RetryableError';
import {
  parseRetryAfter,
  withRetry,
} from '../../../../../src/Shared/Infrastructure/Http/withRetry';
import { caughtRejection } from '../../../../support/caughtError';

// Sleep is injected everywhere below: a test suite that actually waits out an
// exponential backoff takes fifteen seconds and teaches nothing.
const recordedSleeps = (): {
  sleep: (ms: number) => Promise<void>;
  delays: number[];
} => {
  const delays: number[] = [];

  return {
    delays,
    sleep: (ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    },
  };
};

describe('withRetry', () => {
  it('returns the first successful result without sleeping', async () => {
    const { sleep, delays } = recordedSleeps();

    await expect(
      withRetry(() => Promise.resolve('ok'), { sleep }),
    ).resolves.toBe('ok');
    expect(delays).toEqual([]);
  });

  it('retries a retryable failure and returns the eventual success', async () => {
    const { sleep, delays } = recordedSleeps();
    const attempts: number[] = [];

    const result = await withRetry(
      (attempt) => {
        attempts.push(attempt);

        return attempt < 3
          ? Promise.reject(RetryableError.fromStatus(429, 'slow down'))
          : Promise.resolve('third time');
      },
      { sleep, random: () => 1, baseDelayMs: 100 },
    );

    expect(result).toBe('third time');
    expect(attempts).toEqual([1, 2, 3]);
    // Doubling, with the jitter source pinned to its maximum.
    expect(delays).toEqual([100, 200]);
  });

  it('gives up after four attempts by default and rethrows the last failure', async () => {
    const { sleep, delays } = recordedSleeps();
    let calls = 0;

    const error = await caughtRejection(() =>
      withRetry(
        () => {
          calls += 1;
          return Promise.reject(RetryableError.fromStatus(503, 'unavailable'));
        },
        { sleep, random: () => 1 },
      ),
    );

    expect(calls).toBe(4);
    expect(delays).toHaveLength(3);
    expect(error).toBeInstanceOf(RetryableError);
  });

  it('does not retry a failure the adapter did not mark retryable', async () => {
    const { sleep, delays } = recordedSleeps();
    let calls = 0;

    const error = await caughtRejection(() =>
      withRetry(
        () => {
          calls += 1;
          return Promise.reject(new Error('bad api key'));
        },
        { sleep },
      ),
    );

    // A 400 asked four times is still a 400, and on a free tier those attempts
    // cost quota.
    expect(calls).toBe(1);
    expect(delays).toEqual([]);
    expect((error as Error).message).toBe('bad api key');
  });

  it('caps the exponential growth at maxDelayMs', async () => {
    const { sleep, delays } = recordedSleeps();

    await caughtRejection(() =>
      withRetry(() => Promise.reject(RetryableError.fromStatus(500, 'boom')), {
        sleep,
        random: () => 1,
        baseDelayMs: 1_000,
        maxDelayMs: 2_000,
      }),
    );

    expect(delays).toEqual([1_000, 2_000, 2_000]);
  });

  it('waits as long as Retry-After says, ignoring its own backoff', async () => {
    const { sleep, delays } = recordedSleeps();

    await caughtRejection(() =>
      withRetry(
        () => Promise.reject(RetryableError.fromStatus(429, 'quota', 7_000)),
        { sleep, random: () => 1, baseDelayMs: 100, maxAttempts: 2 },
      ),
    );

    // The service knows when its window reopens; our 100ms guess does not.
    expect(delays).toEqual([7_000]);
  });

  it('refuses to honour an absurd Retry-After', async () => {
    const { sleep, delays } = recordedSleeps();

    await caughtRejection(() =>
      withRetry(
        () => Promise.reject(RetryableError.fromStatus(429, 'quota', 900_000)),
        { sleep, maxAttempts: 2 },
      ),
    );

    // Fifteen minutes of blocking is worse than dropping one CV, which the batch
    // pipeline is designed to survive.
    expect(delays).toEqual([60_000]);
  });

  it('jitters within (0, exponential] so a failed batch does not retry in lockstep', async () => {
    const { sleep, delays } = recordedSleeps();

    await caughtRejection(() =>
      withRetry(() => Promise.reject(RetryableError.fromStatus(500, 'boom')), {
        sleep,
        random: () => 0.25,
        baseDelayMs: 400,
        maxAttempts: 3,
      }),
    );

    expect(delays).toEqual([100, 200]);
  });
});

describe('parseRetryAfter', () => {
  it('reads a seconds value', () => {
    expect(parseRetryAfter('12')).toBe(12_000);
  });

  it('reads an HTTP date', () => {
    const twoSecondsFromNow = new Date(Date.now() + 2_000).toUTCString();

    expect(parseRetryAfter(twoSecondsFromNow)).toBeGreaterThan(0);
  });

  it('treats an absent or unparseable header as no guidance', () => {
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter('  ')).toBeNull();
    expect(parseRetryAfter('soon')).toBeNull();
  });
});
