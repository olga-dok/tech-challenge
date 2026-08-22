import type { SeededRandom } from './SeededRandom';

/**
 * A deck shuffled once, then dealt round and round in that same order.
 *
 * The single shuffle is the point. Every diversity guarantee in `CorpusPlan`
 * rests on one property — any run of `size` consecutive draws contains every
 * item exactly once — and re-shuffling on exhaustion would destroy it, leaving
 * "at least ten distinct cities" a probability rather than a fact.
 *
 * It also keeps pairs apart: drawing given names from a 9-deck and family names
 * from a 10-deck cannot repeat a combination until 90 draws in, so a corpus of
 * thirty has no accidental namesakes — only the one we plant on purpose.
 */
export class CyclicDeck<TItem> {
  private position = 0;

  private constructor(private readonly ring: readonly TItem[]) {}

  static shuffled<TItem>(
    items: readonly TItem[],
    random: SeededRandom,
  ): CyclicDeck<TItem> {
    return new CyclicDeck(random.shuffle(items));
  }

  next(): TItem {
    const item = this.ring[this.position % this.ring.length];
    this.position += 1;

    return item;
  }

  get size(): number {
    return this.ring.length;
  }
}
