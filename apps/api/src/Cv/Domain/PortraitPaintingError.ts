import { BaseError } from '../../Shared/Domain';

/**
 * One painter in the chain failed. Never fatal on its own: the chain ends in a
 * locally generated SVG that cannot fail, because a missing portrait must never
 * cost a CV.
 */
export class PortraitPaintingError extends BaseError {
  private constructor(
    message: string,
    readonly provider: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }

  static forProvider(provider: string, cause: unknown): PortraitPaintingError {
    const detail = cause instanceof Error ? cause.message : String(cause);

    return new PortraitPaintingError(
      `Portrait provider "${provider}" failed: ${detail}`,
      provider,
      cause,
    );
  }

  static forEmptyImage(provider: string): PortraitPaintingError {
    return new PortraitPaintingError(
      `Portrait provider "${provider}" returned an empty image`,
      provider,
    );
  }
}
