import {
  CorpusPlan,
  MAX_CORPUS_SIZE,
} from '../../../../src/Cv/Domain/CorpusPlan';
import { InvalidCorpusPlanError } from '../../../../src/Cv/Domain/InvalidCorpusPlanError';
import type { Persona } from '../../../../src/Cv/Domain/Persona';
import { ROLE_FAMILY_PROFILES } from '../../../../src/Cv/Domain/PersonaCatalogue';
import {
  PLANTED_CASE_INDEXES,
  PLANTED_GIVEN_NAME,
  PLANTED_TRAITS,
  UPC_INSTITUTION,
} from '../../../../src/Cv/Domain/PlantedCases';
import { caughtError } from '../../../support/caughtError';

const DEMO_SEED = 42;
const DEMO_SIZE = 25;

const plan = (size = DEMO_SIZE, seed = DEMO_SEED): readonly Persona[] =>
  CorpusPlan.build(size, seed).personas;

const distinct = <TValue>(values: readonly TValue[]): Set<TValue> =>
  new Set(values);

describe('CorpusPlan', () => {
  describe('determinism', () => {
    it('produces an identical plan for the same seed', () => {
      const first = plan();
      const second = plan();

      expect(first).toHaveLength(second.length);
      first.forEach((persona, index) => {
        expect(persona.equals(second[index])).toBe(true);
      });
    });

    it('produces a different plan for a different seed', () => {
      const fullNames = (seed: number): string[] =>
        plan(DEMO_SIZE, seed).map((persona) => persona.fullName);

      expect(fullNames(42)).not.toEqual(fullNames(43));
    });

    it('is a prefix relationship, so a smaller corpus is the start of a larger one', () => {
      // What makes topping up work: asking for 30 after generating 10 adds the
      // missing 20 rather than inventing a different first 10.
      const ten = plan(10);
      const thirty = plan(30);

      ten.forEach((persona, index) => {
        expect(persona.equals(thirty[index])).toBe(true);
      });
    });
  });

  describe('diversity invariants at the demo size', () => {
    it('spreads across at least five role families', () => {
      const families = distinct(plan().map((persona) => persona.roleFamily));

      expect(families.size).toBeGreaterThanOrEqual(5);
    });

    it('covers all three seniority tiers', () => {
      const seniorities = distinct(plan().map((persona) => persona.seniority));

      expect([...seniorities].sort()).toEqual(['JUNIOR', 'MID', 'SENIOR']);
    });

    it('writes CVs in both English and Spanish', () => {
      const languages = distinct(plan().map((persona) => persona.cvLanguage));

      expect([...languages].sort()).toEqual(['en', 'es']);
    });

    it('does not tie the CV language to a seniority tier', () => {
      // The language ring has period five and the seniority cycle period three
      // on purpose. If they lined up, every Spanish CV would be a senior's.
      const spanishSeniorities = distinct(
        plan()
          .filter((persona) => persona.writesInSpanish())
          .map((persona) => persona.seniority),
      );

      expect(spanishSeniorities.size).toBeGreaterThan(1);
    });

    it('places candidates in at least ten distinct cities', () => {
      const cities = distinct(plan().map((persona) => persona.city));

      expect(cities.size).toBeGreaterThanOrEqual(10);
    });

    it('gives every persona two or three distinct traits', () => {
      for (const persona of plan()) {
        expect(persona.distinctiveTraits.length).toBeGreaterThanOrEqual(2);
        expect(persona.distinctiveTraits.length).toBeLessThanOrEqual(3);
        expect(distinct(persona.distinctiveTraits).size).toBe(
          persona.distinctiveTraits.length,
        );
      }
    });

    it('keeps years of experience inside the seniority tier it claims', () => {
      const bounds = {
        JUNIOR: [1, 3],
        MID: [4, 8],
        SENIOR: [9, 16],
      } as const;

      for (const persona of plan()) {
        if (persona.hasTrait(PLANTED_TRAITS.unusuallyLongHistory)) {
          continue;
        }

        const [min, max] = bounds[persona.seniority];
        expect(persona.yearsExperience).toBeGreaterThanOrEqual(min);
        expect(persona.yearsExperience).toBeLessThanOrEqual(max);
      }
    });

    it('includes both genders, without one dominating', () => {
      // Dealt, not inferred: the portrait painter and the Spanish job titles
      // both depend on it, and a name is a poor guess for either.
      const women = plan().filter((persona) => persona.gender === 'female');

      expect(women.length).toBeGreaterThanOrEqual(8);
      expect(women.length).toBeLessThanOrEqual(plan().length - 8);
    });

    it('keeps a candidate gender consistent with the name they were dealt', () => {
      const genderByName = new Map<string, string>();

      for (const persona of plan()) {
        const seen = genderByName.get(persona.givenName);
        expect(seen ?? persona.gender).toBe(persona.gender);
        genderByName.set(persona.givenName, persona.gender);
      }
    });

    it('never hands a lead or principal title to a junior', () => {
      const seniorOnly = Object.values(ROLE_FAMILY_PROFILES).flatMap(
        (profile) => [...profile.seniorOnlyRoles],
      );

      for (const persona of plan()) {
        if (persona.seniority === 'SENIOR') {
          continue;
        }

        expect(seniorOnly).not.toContain(persona.role);
      }
    });

    it('gives every candidate a unique full name apart from the planted namesakes', () => {
      // Slugs derive from the name, and two identical slugs would collide on the
      // unique index at ingestion time.
      const fullNames = plan().map((persona) => persona.fullName);

      expect(distinct(fullNames).size).toBe(fullNames.length);
    });
  });

  describe('planted retrieval-hard cases', () => {
    it('plants exactly two candidates sharing a first name', () => {
      const namesakes = plan().filter(
        (persona) => persona.givenName === PLANTED_GIVEN_NAME,
      );

      expect(namesakes).toHaveLength(2);
      expect(namesakes[0].familyName).not.toBe(namesakes[1].familyName);
      for (const namesake of namesakes) {
        expect(namesake.hasTrait(PLANTED_TRAITS.sharedGivenName)).toBe(true);
      }
    });

    it('plants a UPC graduate in Barcelona, writing in Spanish', () => {
      const upcGraduate = plan()[PLANTED_CASE_INDEXES.upcGraduate];

      expect(upcGraduate.studiedAt(UPC_INSTITUTION)).toBe(true);
      expect(upcGraduate.city).toBe('Barcelona');
      expect(upcGraduate.writesInSpanish()).toBe(true);
    });

    it('plants a candidate whose Python is buried in an experience bullet', () => {
      const hidden = plan()[PLANTED_CASE_INDEXES.pythonHiddenInABullet];

      expect(hidden.hasTrait(PLANTED_TRAITS.pythonHiddenInABullet)).toBe(true);
      expect(hidden.roleFamily).toBe('PRODUCT');
    });

    it('plants one unusually long history', () => {
      const veteran = plan()[PLANTED_CASE_INDEXES.unusuallyLongHistory];

      expect(veteran.hasTrait(PLANTED_TRAITS.unusuallyLongHistory)).toBe(true);
      expect(veteran.yearsExperience).toBe(22);
      expect(veteran.seniority).toBe('SENIOR');
    });
  });

  describe('rejected requests', () => {
    it.each([0, -1, 2.5, MAX_CORPUS_SIZE + 1])(
      'refuses to plan a corpus of %p',
      (size) => {
        expect(
          caughtError(() => CorpusPlan.build(size, DEMO_SEED)),
        ).toBeInstanceOf(InvalidCorpusPlanError);
      },
    );

    it.each([-1, 1.5])('refuses the unreproducible seed %p', (seed) => {
      expect(
        caughtError(() => CorpusPlan.build(DEMO_SIZE, seed)),
      ).toBeInstanceOf(InvalidCorpusPlanError);
    });
  });
});
