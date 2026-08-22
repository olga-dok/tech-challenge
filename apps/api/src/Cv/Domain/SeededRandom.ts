/**
 * A seeded PRNG (mulberry32), because the corpus must be reproducible: the same
 * seed has to yield the same thirty personas, on any machine, forever. That is
 * what makes generation idempotent, a failed run resumable, and the evaluation
 * harness's golden cases stable. `Math.random` would make every one of those
 * impossible, so it appears nowhere in the pipeline.
 */
export class SeededRandom {
  private state: number;

  private constructor(seed: number) {
    this.state = seed >>> 0;
  }

  static fromSeed(seed: number): SeededRandom {
    return new SeededRandom(seed);
  }

  /** A float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let mixed = this.state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  }

  /** An integer in [min, max], both ends inclusive — the range CVs are stated in. */
  intBetween(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<TItem>(items: readonly TItem[]): TItem {
    return items[Math.floor(this.next() * items.length)];
  }

  /** Fisher-Yates, on a copy: the catalogues are module-level constants. */
  shuffle<TItem>(items: readonly TItem[]): TItem[] {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapWith = Math.floor(this.next() * (index + 1));
      [shuffled[index], shuffled[swapWith]] = [
        shuffled[swapWith],
        shuffled[index],
      ];
    }

    return shuffled;
  }
}
