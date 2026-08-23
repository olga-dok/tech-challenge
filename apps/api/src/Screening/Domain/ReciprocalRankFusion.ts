/**
 * Combines several independently-ranked ID lists into one score per ID.
 *
 * Pure and rank-based, not score-based, which is the whole point: cosine
 * similarity, `ts_rank`, and trigram similarity live on three incomparable
 * scales, and RRF sidesteps ever having to normalise between them by only
 * caring about each arm's own ordering.
 */
export function reciprocalRankFusion(
  rankings: readonly (readonly string[])[],
  k = 60,
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const ranking of rankings) {
    ranking.forEach((id, index) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + index + 1));
    });
  }

  return scores;
}
