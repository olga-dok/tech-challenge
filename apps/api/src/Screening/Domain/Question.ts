import { InvalidQuestionError } from './InvalidQuestionError';

/**
 * Validated independently of `AskQuestionRequestSchema`'s wire-level check:
 * the offline evaluation harness calls retrieval directly, without going
 * through the zod-validated HTTP boundary, so this cannot be the only guard.
 */
export class Question {
  private static readonly MAX_LENGTH = 500;

  private constructor(readonly text: string) {}

  static from(value: string): Question {
    const trimmed = value.trim();

    if (trimmed.length === 0 || trimmed.length > Question.MAX_LENGTH) {
      throw InvalidQuestionError.forValue(value);
    }

    return new Question(trimmed);
  }
}
