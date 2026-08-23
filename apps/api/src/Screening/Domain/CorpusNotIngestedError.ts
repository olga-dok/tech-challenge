import { UnprocessableError } from '../../Shared/Domain';

export class CorpusNotIngestedError extends UnprocessableError {
  private constructor(message: string) {
    super(message);
  }

  static create(): CorpusNotIngestedError {
    return new CorpusNotIngestedError(
      'Generate the corpus before asking a question.',
    );
  }
}
