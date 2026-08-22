import { CyclicDeck } from '../../../../src/Cv/Domain/CyclicDeck';
import { SeededRandom } from '../../../../src/Cv/Domain/SeededRandom';

describe('SeededRandom', () => {
  it('replays the same sequence for the same seed', () => {
    const sequence = (seed: number): number[] => {
      const random = SeededRandom.fromSeed(seed);
      return Array.from({ length: 8 }, () => random.next());
    };

    expect(sequence(42)).toEqual(sequence(42));
    expect(sequence(42)).not.toEqual(sequence(43));
  });

  it('stays inside [0, 1)', () => {
    const random = SeededRandom.fromSeed(7);

    for (let draw = 0; draw < 1_000; draw += 1) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('honours both ends of an inclusive integer range', () => {
    const random = SeededRandom.fromSeed(11);
    const drawn = new Set<number>();

    for (let draw = 0; draw < 500; draw += 1) {
      drawn.add(random.intBetween(9, 16));
    }

    expect(Math.min(...drawn)).toBe(9);
    expect(Math.max(...drawn)).toBe(16);
  });

  it('shuffles into a permutation without touching the source', () => {
    const source = Object.freeze(['a', 'b', 'c', 'd', 'e']);
    const shuffled = SeededRandom.fromSeed(3).shuffle(source);

    expect([...shuffled].sort()).toEqual([...source].sort());
    expect(source).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('CyclicDeck', () => {
  it('deals every item once per cycle, in a stable order', () => {
    const deck = CyclicDeck.shuffled(
      ['a', 'b', 'c', 'd'],
      SeededRandom.fromSeed(5),
    );

    const firstCycle = [deck.next(), deck.next(), deck.next(), deck.next()];
    const secondCycle = [deck.next(), deck.next(), deck.next(), deck.next()];

    // The window property every diversity invariant rests on: four consecutive
    // draws are the four items, and the order repeats rather than re-shuffling.
    expect([...firstCycle].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(secondCycle).toEqual(firstCycle);
  });

  it('orders the ring by seed, not by the catalogue', () => {
    const dealt = (seed: number): string[] => {
      const deck = CyclicDeck.shuffled(
        ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        SeededRandom.fromSeed(seed),
      );
      return Array.from({ length: 7 }, () => deck.next());
    };

    expect(dealt(1)).toEqual(dealt(1));
    expect(dealt(1)).not.toEqual(dealt(2));
  });
});
