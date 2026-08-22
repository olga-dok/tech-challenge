import { BaseError } from '../../Shared/Domain';

export class PdfRenderingError extends BaseError {
  private constructor(
    message: string,
    readonly candidate: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }

  static forCandidate(candidate: string, cause: unknown): PdfRenderingError {
    const detail = cause instanceof Error ? cause.message : String(cause);

    return new PdfRenderingError(
      `Rendering the CV for ${candidate} failed: ${detail}`,
      candidate,
      cause,
    );
  }

  static forBrowserLaunch(cause: unknown): PdfRenderingError {
    const detail = cause instanceof Error ? cause.message : String(cause);

    return new PdfRenderingError(
      `Could not start the headless browser: ${detail}. On Linux this is usually a missing system library — see the README.`,
      '(browser)',
      cause,
    );
  }
}
