import { InvalidPersonaError } from '../../../../src/Cv/Domain/InvalidPersonaError';
import {
  Persona,
  type PersonaAttributes,
} from '../../../../src/Cv/Domain/Persona';
import { caughtError } from '../../../support/caughtError';

const ATTRIBUTES: PersonaAttributes = {
  givenName: 'Ana',
  familyName: 'Ruiz',
  gender: 'female',
  roleFamily: 'BACKEND',
  role: 'Senior Backend Engineer',
  seniority: 'SENIOR',
  industry: 'fintech',
  city: 'Barcelona',
  country: 'Spain',
  primaryLanguage: 'Spanish',
  cvLanguage: 'es',
  university: 'Universitat Politècnica de Catalunya (UPC)',
  yearsExperience: 11,
  distinctiveTraits: [
    'maintains an open-source library',
    'mentors at a bootcamp',
  ],
};

const personaWith = (overrides: Partial<PersonaAttributes>): Persona =>
  Persona.from({ ...ATTRIBUTES, ...overrides });

describe('Persona', () => {
  it('exposes the identity the drafter and the stream both need', () => {
    const persona = personaWith({});

    expect(persona.fullName).toBe('Ana Ruiz');
    expect(persona.label()).toBe('Senior Backend Engineer · Barcelona · 11y');
    expect(persona.writesInSpanish()).toBe(true);
    expect(
      persona.studiedAt('Universitat Politècnica de Catalunya (UPC)'),
    ).toBe(true);
  });

  it('is immutable: traits handed in cannot be changed afterwards', () => {
    const traits = [
      'maintains an open-source library',
      'mentors at a bootcamp',
    ];
    const persona = personaWith({ distinctiveTraits: traits });

    traits.push('a trait added after the fact');

    expect(persona.distinctiveTraits).toHaveLength(2);
    expect(() => {
      (persona.distinctiveTraits as string[]).push('smuggled in');
    }).toThrow();
  });

  it('compares by value, so two draws of the same person are equal', () => {
    expect(personaWith({}).equals(personaWith({}))).toBe(true);
    expect(personaWith({}).equals(personaWith({ city: 'Madrid' }))).toBe(false);
  });

  it.each(['givenName', 'familyName', 'role', 'city', 'university'] as const)(
    'rejects a blank %s',
    (field) => {
      expect(caughtError(() => personaWith({ [field]: '  ' }))).toBeInstanceOf(
        InvalidPersonaError,
      );
    },
  );

  it.each([-1, 4.5, 46])('rejects %p years of experience', (years) => {
    expect(
      caughtError(() => personaWith({ yearsExperience: years })),
    ).toBeInstanceOf(InvalidPersonaError);
  });

  it('insists on two or three distinctive traits', () => {
    expect(
      caughtError(() => personaWith({ distinctiveTraits: ['only one'] })),
    ).toBeInstanceOf(InvalidPersonaError);
    expect(
      caughtError(() =>
        personaWith({ distinctiveTraits: ['a', 'b', 'c', 'd'] }),
      ),
    ).toBeInstanceOf(InvalidPersonaError);
  });

  it('rejects a repeated trait, which would waste one of the two or three', () => {
    expect(
      caughtError(() =>
        personaWith({ distinctiveTraits: ['same trait', 'same trait'] }),
      ),
    ).toBeInstanceOf(InvalidPersonaError);
  });
});
