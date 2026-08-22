import { BaseError } from '../../Shared/Domain';

/**
 * The drafter gave up. Thrown only after the model has had its second chance
 * with the validation errors fed back to it — one persona failing is survivable
 * (the batch pipeline skips it), so this is a report, not a catastrophe.
 */
export class ProfileDraftingError extends BaseError {
  private constructor(
    message: string,
    readonly candidate: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }

  static forInvalidProfile(
    candidate: string,
    issues: readonly string[],
  ): ProfileDraftingError {
    return new ProfileDraftingError(
      `The model could not produce a valid profile for ${candidate}, even after being shown its own errors: ${issues.join('; ')}`,
      candidate,
    );
  }

  static forUnusableResponse(
    candidate: string,
    detail: string,
  ): ProfileDraftingError {
    return new ProfileDraftingError(
      `The model's response for ${candidate} contained no JSON object: ${detail}`,
      candidate,
    );
  }

  static forTransportFailure(
    candidate: string,
    cause: unknown,
  ): ProfileDraftingError {
    const detail = cause instanceof Error ? cause.message : String(cause);

    return new ProfileDraftingError(
      `Drafting ${candidate} failed: ${detail}`,
      candidate,
      cause,
    );
  }
}
