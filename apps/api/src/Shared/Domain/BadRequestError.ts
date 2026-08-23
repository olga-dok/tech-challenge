import { HttpError } from './HttpError';

export abstract class BadRequestError extends HttpError {
  protected constructor(message: string) {
    super(message, 400);
  }
}
