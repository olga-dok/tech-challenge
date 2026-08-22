import {
  CorpusPlan,
  MAX_CORPUS_SIZE,
} from '../../../../src/Cv/Domain/CorpusPlan';
import { PLANTED_GIVEN_NAME } from '../../../../src/Cv/Domain/PlantedCases';

/**
 * The invariants `CorpusPlan.spec.ts` asserts on the demo seed, re-checked over
 * a range of seeds and sizes.
 *
 * This is what separates "dealt from decks" from "randomly sampled and it looked
 * fine once". It also guards the catalogue: the name decks are 9/10 and 11/12
 * because coprime sizes cannot repeat a (given, family) pairing inside a corpus
 * of forty, and adding one name to a list would quietly break that. A duplicate
 * full name means a duplicate slug, which means a unique-constraint failure
 * halfway through a five-minute generation run.
 */
const countDistinct = <TValue>(values: readonly TValue[]): number =>
  new Set(values).size;

describe('CorpusPlan invariants', () => {
  it('holds every diversity guarantee for 120 seeds at the demo size', () => {
    const failures: string[] = [];

    for (let seed = 0; seed < 120; seed += 1) {
      const { personas } = CorpusPlan.build(30, seed);
      const report = (problem: string): number =>
        failures.push(`seed ${String(seed)}: ${problem}`);

      const families = countDistinct(personas.map((p) => p.roleFamily));
      if (families < 5) report(`only ${String(families)} role families`);

      const cities = countDistinct(personas.map((p) => p.city));
      if (cities < 10) report(`only ${String(cities)} cities`);

      const namesakes = personas.filter(
        (p) => p.givenName === PLANTED_GIVEN_NAME,
      ).length;
      if (namesakes !== 2) report(`${String(namesakes)} planted namesakes`);

      const spanishTiers = countDistinct(
        personas.filter((p) => p.writesInSpanish()).map((p) => p.seniority),
      );
      if (spanishTiers < 2) {
        report('Spanish CVs collapsed onto one seniority tier');
      }
    }

    expect(failures.slice(0, 10)).toEqual([]);
  });

  it('never repeats a full name, at any size, for 40 seeds', () => {
    const failures: string[] = [];

    for (let seed = 0; seed < 40; seed += 1) {
      for (let size = 1; size <= MAX_CORPUS_SIZE; size += 1) {
        const { personas } = CorpusPlan.build(size, seed);
        const unique = countDistinct(personas.map((p) => p.fullName));

        if (unique !== size) {
          failures.push(
            `seed ${String(seed)} size ${String(size)}: ${String(unique)} unique names`,
          );
        }
      }
    }

    expect(failures.slice(0, 10)).toEqual([]);
  });

  it('covers both CV languages and all three seniority tiers from size five up', () => {
    const failures: string[] = [];

    for (let seed = 0; seed < 40; seed += 1) {
      for (let size = 5; size <= MAX_CORPUS_SIZE; size += 1) {
        const { personas } = CorpusPlan.build(size, seed);

        if (countDistinct(personas.map((p) => p.cvLanguage)) !== 2) {
          failures.push(
            `seed ${String(seed)} size ${String(size)}: one CV language`,
          );
        }
        if (countDistinct(personas.map((p) => p.seniority)) !== 3) {
          failures.push(
            `seed ${String(seed)} size ${String(size)}: missing a seniority tier`,
          );
        }
      }
    }

    expect(failures.slice(0, 10)).toEqual([]);
  });
});
