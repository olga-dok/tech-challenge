import { BaseError } from '../../Shared/Domain';

export class InvalidPersonaError extends BaseError {
  private constructor(message: string) {
    super(message);
  }

  static forBlankField(field: string): InvalidPersonaError {
    return new InvalidPersonaError(`Persona.${field} must not be blank`);
  }

  static forYearsExperience(years: number): InvalidPersonaError {
    return new InvalidPersonaError(
      `Persona.yearsExperience must be a whole number between 0 and 45, got ${String(years)}`,
    );
  }

  static forTraitCount(count: number): InvalidPersonaError {
    return new InvalidPersonaError(
      `A persona needs two or three distinctive traits to read as a person rather than a template, got ${String(count)}`,
    );
  }

  static forRepeatedTrait(trait: string): InvalidPersonaError {
    return new InvalidPersonaError(
      `Persona.distinctiveTraits must not repeat: "${trait}"`,
    );
  }
}
