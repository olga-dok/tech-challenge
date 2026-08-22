import { CorpusPlan } from '../../../../src/Cv/Domain/CorpusPlan';
import {
  intoBatches,
  nextBatchDelay,
  type BatchPacing,
} from '../../../../src/Cv/Domain/corpusBatching';

const personas = (
  count: number,
): ReturnType<typeof CorpusPlan.build>['personas'] =>
  CorpusPlan.build(count, 42).personas;

const PACING: BatchPacing = {
  batchDelayMs: 1_500,
  batchBackoffFactor: 2,
  maxBatchDelayMs: 60_000,
};

describe('intoBatches', () => {
  it('splits a plan into equal batches', () => {
    const batches = intoBatches(personas(30), 5);

    expect(batches).toHaveLength(6);
    expect(batches.every((batch) => batch.length === 5)).toBe(true);
  });

  it('leaves a short final batch rather than padding it', () => {
    const batches = intoBatches(personas(13), 5);

    expect(batches.map((batch) => batch.length)).toEqual([5, 5, 3]);
  });

  it('keeps the plan order, so batch one is the first five personas', () => {
    const plan = personas(10);
    const batches = intoBatches(plan, 4);

    expect(batches[0][0].equals(plan[0])).toBe(true);
    expect(batches[1][0].equals(plan[4])).toBe(true);
    expect(batches.flat()).toHaveLength(10);
  });

  it('makes one batch when the size exceeds the corpus', () => {
    expect(intoBatches(personas(3), 10)).toHaveLength(1);
  });

  it('handles a batch size of one', () => {
    expect(intoBatches(personas(4), 1).map((batch) => batch.length)).toEqual([
      1, 1, 1, 1,
    ]);
  });

  it('rejects a batch size that would never terminate', () => {
    expect(() => intoBatches(personas(5), 0)).toThrow(TypeError);
    expect(() => intoBatches(personas(5), -1)).toThrow(TypeError);
    expect(() => intoBatches(personas(5), 2.5)).toThrow(TypeError);
  });
});

describe('nextBatchDelay', () => {
  it('keeps the configured pacing when nothing was throttled', () => {
    expect(nextBatchDelay(1_500, false, PACING)).toBe(1_500);
  });

  it('multiplies the delay after a throttled batch', () => {
    expect(nextBatchDelay(1_500, true, PACING)).toBe(3_000);
  });

  it('compounds across repeated throttling', () => {
    const first = nextBatchDelay(1_500, true, PACING);
    const second = nextBatchDelay(first, true, PACING);

    expect(second).toBe(6_000);
  });

  it('carries a raised delay forward instead of easing off', () => {
    // Once a free tier has started refusing, dropping back to the base delay
    // just earns another 429.
    expect(nextBatchDelay(6_000, false, PACING)).toBe(6_000);
  });

  it('respects the ceiling', () => {
    expect(nextBatchDelay(40_000, true, PACING)).toBe(60_000);
    expect(nextBatchDelay(90_000, false, PACING)).toBe(60_000);
  });

  it('still produces a real pause when pacing is disabled', () => {
    const noPacing: BatchPacing = { ...PACING, batchDelayMs: 0 };

    expect(nextBatchDelay(0, false, noPacing)).toBe(0);
    // A throttle with no configured delay has to back off to something.
    expect(nextBatchDelay(0, true, noPacing)).toBe(2_000);
  });

  it('never returns a fractional delay', () => {
    const odd: BatchPacing = { ...PACING, batchBackoffFactor: 1.5 };

    expect(Number.isInteger(nextBatchDelay(1_001, true, odd))).toBe(true);
  });
});
