/**
 * Whether a failure means "the free tier said slow down".
 *
 * The distinction drives real behaviour — the pipeline lengthens its pacing and
 * the UI says "waiting out a rate limit" instead of implying something broke —
 * so the question has to be answerable from the Application layer, which cannot
 * see HTTP status codes. Adapters mark their errors instead, and this reads the
 * mark anywhere in the cause chain.
 */
export function isRateLimited(error: unknown): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== 'object' || current === null) {
      return false;
    }

    if ((current as { rateLimited?: unknown }).rateLimited === true) {
      return true;
    }

    current = (current as { cause?: unknown }).cause;
  }

  return false;
}
