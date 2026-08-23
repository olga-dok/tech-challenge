import { NotFoundError } from '../../Shared/Domain';

/**
 * Reserved for a genuinely empty retrieval outcome treated as a hard stop
 * rather than handed to the answerer. The demo's own "no answer in the
 * corpus" case is *not* this — that still calls the answerer, whose system
 * prompt produces a plain-language refusal, so the chat reads like a refusal
 * rather than an aborted stream.
 */
export class NoRelevantContextError extends NotFoundError {
  private constructor(message: string) {
    super(message);
  }

  static forQuestion(text: string): NoRelevantContextError {
    return new NoRelevantContextError(
      `No relevant context was found for "${text.slice(0, 80)}"`,
    );
  }
}
