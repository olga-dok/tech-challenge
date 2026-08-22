import { BaseError } from '../../Shared/Domain';

export class InvalidCorpusPlanError extends BaseError {
  private constructor(message: string) {
    super(message);
  }

  static forSize(size: number, maximum: number): InvalidCorpusPlanError {
    return new InvalidCorpusPlanError(
      `A corpus of ${String(size)} is not plannable: size must be a whole number between 1 and ${String(maximum)}`,
    );
  }

  static forSeed(seed: number): InvalidCorpusPlanError {
    return new InvalidCorpusPlanError(
      `A corpus seed must be a non-negative whole number to stay reproducible, got ${String(seed)}`,
    );
  }
}
