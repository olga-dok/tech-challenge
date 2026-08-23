import { HttpError } from './HttpError';

export abstract class NotFoundError extends HttpError {
  protected constructor(message: string) {
    super(message, 404);
  }
}
