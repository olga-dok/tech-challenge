import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { HttpError } from '../../Domain';

/**
 * Converts any thrown `HttpError` into an RFC 7807 Problem Details response.
 *
 * Scoped to `HttpError` only — Nest's own built-in exceptions (thrown by
 * `ZodValidationPipe`, or manually for filesystem conditions like a missing
 * portrait file) are untouched, keeping their existing response shape rather
 * than reshaping every error response in the app in one step.
 */
@Catch(HttpError)
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(error: HttpError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    response.status(error.status).type('application/problem+json').json({
      type: 'about:blank',
      title: error.constructor.name,
      status: error.status,
      detail: error.message,
    });
  }
}
