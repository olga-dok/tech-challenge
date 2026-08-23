import { BaseError } from '../../Shared/Domain';
import type { Slug } from './Slug';

export class CandidateNotFoundError extends BaseError {
  private constructor(message: string) {
    super(message);
  }

  static forSlug(slug: Slug): CandidateNotFoundError {
    return new CandidateNotFoundError(
      `No candidate found for slug "${slug.value}"`,
    );
  }
}
