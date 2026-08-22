import { BaseError } from '../../Shared/Domain';

export class InvalidSlugError extends BaseError {
  private constructor(message: string) {
    super(message);
  }

  static forValue(value: string): InvalidSlugError {
    return new InvalidSlugError(
      `"${value}" is not a valid slug: expected lowercase words joined by single hyphens`,
    );
  }

  static forName(fullName: string): InvalidSlugError {
    return new InvalidSlugError(
      `No slug can be derived from the name "${fullName}"`,
    );
  }
}
