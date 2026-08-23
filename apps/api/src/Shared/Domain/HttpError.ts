import { BaseError } from './BaseError';

/** Carries the HTTP status the global exception filter reports it as. */
export abstract class HttpError extends BaseError {
  protected constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
