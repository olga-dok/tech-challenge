import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Validates a request body against a contract schema.
 *
 * The schemas in `@repo/contracts` already describe every request shape, so
 * hand-writing Nest DTO classes with decorators would be the same shape twice —
 * and the frontend would be validating against the copy that drifted.
 *
 * Errors come back as a flat `field: message` list, which is what a client can
 * actually act on.
 */
export class ZodValidationPipe<TValue> implements PipeTransform {
  constructor(private readonly schema: ZodType<TValue>) {}

  transform(value: unknown): TValue {
    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    throw new BadRequestException({
      message: 'The request body is invalid',
      problems: result.error.issues.map((issue) => ({
        field: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    });
  }
}
