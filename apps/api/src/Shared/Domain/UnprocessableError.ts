import { HttpError } from './HttpError';

export abstract class UnprocessableError extends HttpError {
  protected constructor(message: string) {
    super(message, 422);
  }
}
