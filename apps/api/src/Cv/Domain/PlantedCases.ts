import type { PersonaAttributes } from './Persona';

/**
 * Deliberately awkward candidates, planted at fixed positions in every plan.
 *
 * A corpus where every question is easy proves nothing. Each case here breaks a
 * specific retrieval strategy, so the evaluation harness can show the difference
 * between the arms instead of asserting it:
 *
 *   * two candidates sharing a first name — "summarize Ana's profile" has to
 *     stay ambiguous, and the name arm has to return both
 *   * Python mentioned only inside an experience bullet — a skills-list lookup
 *     misses it entirely, which is the case for chunking experience entries
 *     separately and embedding them with their identity header
 *   * a twenty-two-year history — the longest CV, which is where a fixed-window
 *     chunker starts truncating people
 *   * a known UPC graduate — the brief asks who studied there, and "UPC" is an
 *     exact token that dense retrieval alone tends to miss
 *
 * The traits are exported constants rather than inline strings because three
 * places need the same text: the drafter prompt that must honour it, the tests
 * that assert it was planted, and the golden-case generator that turns it into
 * an expected answer.
 */

export const PLANTED_TRAITS = {
  pythonHiddenInABullet:
    'writes Python in one experience bullet only — Python must never appear in the skills list',
  unusuallyLongHistory:
    'a twenty-two-year career across five companies, all of it listed',
  sharedGivenName:
    'shares a first name with another candidate, so the surname is the only way to tell them apart',
} as const;

export const PLANTED_GIVEN_NAME = 'Ana';

export const UPC_INSTITUTION = 'Universitat Politècnica de Catalunya (UPC)';

/**
 * Positions, not identities: a plan is an ordered list, and generation walks it
 * in order, so fixing the index fixes which batch each hard case lands in too.
 */
export const PLANTED_CASE_INDEXES = {
  firstNamesake: 2,
  upcGraduate: 5,
  pythonHiddenInABullet: 9,
  secondNamesake: 17,
  unusuallyLongHistory: 23,
} as const;

/** The smallest corpus that contains every planted case. */
export const SMALLEST_COMPLETE_CORPUS =
  Math.max(...Object.values(PLANTED_CASE_INDEXES)) + 1;

const withTrait = (
  attributes: PersonaAttributes,
  trait: string,
): PersonaAttributes => ({
  ...attributes,
  // The planted trait leads, and the drawn ones fill the rest: a persona carries
  // at most three, and this one is the reason it exists.
  distinctiveTraits: [trait, ...attributes.distinctiveTraits].slice(0, 3),
});

export function applyPlantedCase(
  index: number,
  attributes: PersonaAttributes,
): PersonaAttributes {
  switch (index) {
    case PLANTED_CASE_INDEXES.firstNamesake:
    case PLANTED_CASE_INDEXES.secondNamesake:
      // Only the given name is forced. The family name comes from the deck,
      // which cannot repeat a pairing inside a corpus this size, so the two are
      // guaranteed to differ.
      return withTrait(
        { ...attributes, givenName: PLANTED_GIVEN_NAME },
        PLANTED_TRAITS.sharedGivenName,
      );

    case PLANTED_CASE_INDEXES.upcGraduate:
      return {
        ...attributes,
        cvLanguage: 'es',
        city: 'Barcelona',
        country: 'Spain',
        primaryLanguage: 'Spanish',
        university: UPC_INSTITUTION,
      };

    case PLANTED_CASE_INDEXES.pythonHiddenInABullet:
      // A product manager, so Python in the skills list would look odd anyway —
      // the fact has to be dug out of the prose, which is the whole point.
      return withTrait(
        {
          ...attributes,
          roleFamily: 'PRODUCT',
          role: 'Technical Product Manager',
        },
        PLANTED_TRAITS.pythonHiddenInABullet,
      );

    case PLANTED_CASE_INDEXES.unusuallyLongHistory:
      return withTrait(
        { ...attributes, seniority: 'SENIOR', yearsExperience: 22 },
        PLANTED_TRAITS.unusuallyLongHistory,
      );

    default:
      return attributes;
  }
}
