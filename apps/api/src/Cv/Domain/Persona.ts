// Types only, so the domain layer stays free of runtime dependencies while the
// enums that cross the API boundary keep their single definition in contracts.
import type { CvLanguage, RoleFamily, Seniority } from '@repo/contracts';
import { InvalidPersonaError } from './InvalidPersonaError';

/**
 * Decided by the plan, never inferred from a name.
 *
 * It exists because two things downstream need it and cannot guess it well: the
 * portrait has to match the person on the page, and Spanish job titles are
 * gendered. Names are a poor proxy for either.
 */
export type PersonaGender = 'female' | 'male';

export interface PersonaAttributes {
  readonly givenName: string;
  readonly familyName: string;
  readonly gender: PersonaGender;
  readonly roleFamily: RoleFamily;
  readonly role: string;
  readonly seniority: Seniority;
  readonly industry: string;
  readonly city: string;
  readonly country: string;
  readonly primaryLanguage: string;
  readonly cvLanguage: CvLanguage;
  readonly university: string;
  readonly yearsExperience: number;
  readonly distinctiveTraits: readonly string[];
}

const REQUIRED_TEXT_FIELDS = [
  'givenName',
  'familyName',
  'role',
  'industry',
  'city',
  'country',
  'primaryLanguage',
  'university',
] as const satisfies readonly (keyof PersonaAttributes)[];

const MAX_YEARS_EXPERIENCE = 45;

/**
 * One imagined candidate, decided before any LLM is involved.
 *
 * This is the brief the drafter writes to, and afterwards the reason the corpus
 * is measurable: we know who is in it, where they studied and what makes each of
 * them awkward to retrieve, because we chose all of it.
 */
export class Persona {
  readonly givenName: string;
  readonly familyName: string;
  readonly gender: PersonaGender;
  readonly roleFamily: RoleFamily;
  readonly role: string;
  readonly seniority: Seniority;
  readonly industry: string;
  readonly city: string;
  readonly country: string;
  readonly primaryLanguage: string;
  readonly cvLanguage: CvLanguage;
  readonly university: string;
  readonly yearsExperience: number;
  readonly distinctiveTraits: readonly string[];

  private constructor(attributes: PersonaAttributes) {
    this.ensureIsValid(attributes);

    this.givenName = attributes.givenName;
    this.familyName = attributes.familyName;
    this.gender = attributes.gender;
    this.roleFamily = attributes.roleFamily;
    this.role = attributes.role;
    this.seniority = attributes.seniority;
    this.industry = attributes.industry;
    this.city = attributes.city;
    this.country = attributes.country;
    this.primaryLanguage = attributes.primaryLanguage;
    this.cvLanguage = attributes.cvLanguage;
    this.university = attributes.university;
    this.yearsExperience = attributes.yearsExperience;
    this.distinctiveTraits = Object.freeze([...attributes.distinctiveTraits]);
  }

  static from(attributes: PersonaAttributes): Persona {
    return new Persona(attributes);
  }

  get fullName(): string {
    return `${this.givenName} ${this.familyName}`;
  }

  /** What the generation stream shows while this CV is being written. */
  label(): string {
    return `${this.role} · ${this.city} · ${this.yearsExperience}y`;
  }

  writesInSpanish(): boolean {
    return this.cvLanguage === 'es';
  }

  hasTrait(trait: string): boolean {
    return this.distinctiveTraits.includes(trait);
  }

  studiedAt(institution: string): boolean {
    return this.university === institution;
  }

  equals(other: Persona): boolean {
    return this.identity() === other.identity();
  }

  private identity(): string {
    return [
      this.fullName,
      this.gender,
      this.roleFamily,
      this.role,
      this.seniority,
      this.industry,
      this.city,
      this.country,
      this.primaryLanguage,
      this.cvLanguage,
      this.university,
      String(this.yearsExperience),
      ...this.distinctiveTraits,
    ].join('|');
  }

  private ensureIsValid(attributes: PersonaAttributes): void {
    for (const field of REQUIRED_TEXT_FIELDS) {
      if (String(attributes[field]).trim().length === 0) {
        throw InvalidPersonaError.forBlankField(field);
      }
    }

    if (
      !Number.isInteger(attributes.yearsExperience) ||
      attributes.yearsExperience < 0 ||
      attributes.yearsExperience > MAX_YEARS_EXPERIENCE
    ) {
      throw InvalidPersonaError.forYearsExperience(attributes.yearsExperience);
    }

    const traits = attributes.distinctiveTraits;
    if (traits.length < 2 || traits.length > 3) {
      throw InvalidPersonaError.forTraitCount(traits.length);
    }

    const seen = new Set<string>();
    for (const trait of traits) {
      if (seen.has(trait)) {
        throw InvalidPersonaError.forRepeatedTrait(trait);
      }
      seen.add(trait);
    }
  }
}
