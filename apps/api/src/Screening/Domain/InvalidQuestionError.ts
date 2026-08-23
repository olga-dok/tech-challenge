import { BaseError } from '../../Shared/Domain';

export class InvalidQuestionError extends BaseError {
  private constructor(message: string) {
    super(message);
  }

  static forValue(value: string): InvalidQuestionError {
    return new InvalidQuestionError(
      `"${value.slice(0, 60)}" is not a valid question: expected 1-500 non-blank characters`,
    );
  }
}
