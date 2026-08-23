import { reciprocalRankFusion } from '../../../../src/Screening/Domain/ReciprocalRankFusion';

describe('reciprocalRankFusion', () => {
  it('scores a single ranking in strictly decreasing order', () => {
    const scores = reciprocalRankFusion([['a', 'b', 'c']]);

    expect(scores.get('a')).toBeGreaterThan(scores.get('b') as number);
    expect(scores.get('b')).toBeGreaterThan(scores.get('c') as number);
  });

  it('ranks an item appearing highly across multiple arms above one appearing in only one', () => {
    const scores = reciprocalRankFusion([
      ['a', 'x', 'y'],
      ['a', 'z', 'w'],
      ['b', 'a', 'v'],
    ]);

    // "a" is top-1 or top-2 in every arm; "b" only ever appears once, at rank 1.
    expect(scores.get('a') as number).toBeGreaterThan(
      scores.get('b') as number,
    );
  });

  it('still scores an item that appears in only one ranking', () => {
    const scores = reciprocalRankFusion([
      ['a', 'b'],
      ['c', 'd'],
    ]);

    expect(scores.get('a')).toBeGreaterThan(0);
    expect(scores.get('d')).toBeGreaterThan(0);
  });

  it('returns an empty map for no rankings', () => {
    expect(reciprocalRankFusion([]).size).toBe(0);
  });

  it('returns an empty map when every ranking is empty', () => {
    expect(reciprocalRankFusion([[], []]).size).toBe(0);
  });

  it('sums contributions across arms rather than taking the best one', () => {
    const inOneArm = reciprocalRankFusion([['a', 'b']]).get('a') as number;
    const inTwoArms = reciprocalRankFusion([
      ['a', 'b'],
      ['a', 'b'],
    ]).get('a') as number;

    expect(inTwoArms).toBeCloseTo(inOneArm * 2);
  });

  it('follows the 1/(k + rank) formula exactly', () => {
    const scores = reciprocalRankFusion([['a', 'b']], 60);

    expect(scores.get('a')).toBeCloseTo(1 / 61);
    expect(scores.get('b')).toBeCloseTo(1 / 62);
  });

  it('a smaller k widens the gap between top ranks', () => {
    const wideGap = reciprocalRankFusion([['a', 'b']], 1);
    const narrowGap = reciprocalRankFusion([['a', 'b']], 1000);

    const wideRatio =
      (wideGap.get('a') as number) / (wideGap.get('b') as number);
    const narrowRatio =
      (narrowGap.get('a') as number) / (narrowGap.get('b') as number);

    expect(wideRatio).toBeGreaterThan(narrowRatio);
  });
});
