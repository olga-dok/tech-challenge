import { CyclicDeck } from './CyclicDeck';
import { InvalidCorpusPlanError } from './InvalidCorpusPlanError';
import { Persona, type PersonaAttributes } from './Persona';
import {
  CV_LANGUAGE_RING,
  DISTINCTIVE_TRAITS,
  INTERNATIONAL_FAMILY_NAMES,
  INTERNATIONAL_GIVEN_NAMES,
  OTHER_CITIES,
  ROLE_FAMILY_ORDER,
  ROLE_FAMILY_PROFILES,
  SENIORITY_TIERS,
  SPANISH_FAMILY_NAMES,
  SPANISH_GIVEN_NAMES,
  SPANISH_SPEAKING_CITIES,
  type CityProfile,
  type GivenName,
} from './PersonaCatalogue';
import { applyPlantedCase } from './PlantedCases';
import { SeededRandom } from './SeededRandom';

export const MAX_CORPUS_SIZE = 40;

interface PlanningDecks {
  readonly roleFamilies: CyclicDeck<(typeof ROLE_FAMILY_ORDER)[number]>;
  readonly cvLanguages: CyclicDeck<(typeof CV_LANGUAGE_RING)[number]>;
  readonly spanishCities: CyclicDeck<CityProfile>;
  readonly otherCities: CyclicDeck<CityProfile>;
  readonly spanishGivenNames: CyclicDeck<GivenName>;
  readonly spanishFamilyNames: CyclicDeck<string>;
  readonly internationalGivenNames: CyclicDeck<GivenName>;
  readonly internationalFamilyNames: CyclicDeck<string>;
  readonly traits: CyclicDeck<string>;
}

/**
 * The ordered list of people a generation run will invent, decided up front.
 *
 * Asking an LLM for thirty CVs in a loop produces thirty near-identical ones:
 * the same three cities, the same "passionate about clean code" summary, the
 * same three-job arc. So variety is not requested, it is dealt — every attribute
 * comes from a deck (see `CyclicDeck`), which turns "the corpus is diverse" from
 * a hope into an invariant a test can assert.
 *
 * Everything here is pure and seeded. Same seed, same thirty people, which is
 * what makes a run resumable and the evaluation set stable.
 */
export class CorpusPlan {
  private constructor(
    readonly seed: number,
    readonly personas: readonly Persona[],
  ) {}

  static build(size: number, seed: number): CorpusPlan {
    if (!Number.isInteger(size) || size < 1 || size > MAX_CORPUS_SIZE) {
      throw InvalidCorpusPlanError.forSize(size, MAX_CORPUS_SIZE);
    }

    if (!Number.isInteger(seed) || seed < 0) {
      throw InvalidCorpusPlanError.forSeed(seed);
    }

    const random = SeededRandom.fromSeed(seed);
    const decks = buildDecks(random);

    const personas: Persona[] = [];
    for (let index = 0; index < size; index += 1) {
      personas.push(
        Persona.from(applyPlantedCase(index, draw(index, decks, random))),
      );
    }

    return new CorpusPlan(seed, Object.freeze(personas));
  }

  get size(): number {
    return this.personas.length;
  }

  personaAt(index: number): Persona {
    return this.personas[index];
  }
}

// Deck construction order is part of the seed's meaning: reordering these lines
// changes every plan ever produced by a given seed.
function buildDecks(random: SeededRandom): PlanningDecks {
  return {
    roleFamilies: CyclicDeck.shuffled(ROLE_FAMILY_ORDER, random),
    cvLanguages: CyclicDeck.shuffled(CV_LANGUAGE_RING, random),
    spanishCities: CyclicDeck.shuffled(SPANISH_SPEAKING_CITIES, random),
    otherCities: CyclicDeck.shuffled(OTHER_CITIES, random),
    spanishGivenNames: CyclicDeck.shuffled(SPANISH_GIVEN_NAMES, random),
    spanishFamilyNames: CyclicDeck.shuffled(SPANISH_FAMILY_NAMES, random),
    internationalGivenNames: CyclicDeck.shuffled(
      INTERNATIONAL_GIVEN_NAMES,
      random,
    ),
    internationalFamilyNames: CyclicDeck.shuffled(
      INTERNATIONAL_FAMILY_NAMES,
      random,
    ),
    traits: CyclicDeck.shuffled(DISTINCTIVE_TRAITS, random),
  };
}

function draw(
  index: number,
  decks: PlanningDecks,
  random: SeededRandom,
): PersonaAttributes {
  const roleFamily = decks.roleFamilies.next();
  const familyProfile = ROLE_FAMILY_PROFILES[roleFamily];

  // Seniority cycles on the index rather than being dealt: three tiers in strict
  // rotation is the only way a corpus of three still covers all three.
  const tier = SENIORITY_TIERS[index % SENIORITY_TIERS.length];

  const cvLanguage = decks.cvLanguages.next();
  const writesInSpanish = cvLanguage === 'es';

  // A Spanish CV comes from a Spanish-speaking city, so the language of the
  // document and the life behind it agree.
  const city = writesInSpanish
    ? decks.spanishCities.next()
    : decks.otherCities.next();

  const given = writesInSpanish
    ? decks.spanishGivenNames.next()
    : decks.internationalGivenNames.next();
  const familyName = writesInSpanish
    ? decks.spanishFamilyNames.next()
    : decks.internationalFamilyNames.next();

  // Lead and principal titles are only in play for the senior tier, so nobody
  // ends up a three-year Design Lead.
  const availableRoles =
    tier.seniority === 'SENIOR'
      ? [...familyProfile.roles, ...familyProfile.seniorOnlyRoles]
      : familyProfile.roles;

  return {
    givenName: given.name,
    gender: given.gender,
    familyName,
    roleFamily,
    role: random.pick(availableRoles),
    seniority: tier.seniority,
    industry: random.pick(familyProfile.industries),
    city: city.city,
    country: city.country,
    primaryLanguage: city.primaryLanguage,
    cvLanguage,
    university: random.pick(city.universities),
    yearsExperience: random.intBetween(tier.minYears, tier.maxYears),
    // Two adjacent draws from one deck are always different traits.
    distinctiveTraits: [decks.traits.next(), decks.traits.next()],
  };
}
