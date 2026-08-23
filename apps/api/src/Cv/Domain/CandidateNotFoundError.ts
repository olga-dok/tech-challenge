import { NotFoundError } from '../../Shared/Domain';
import type { Slug } from './Slug';

export class CandidateNotFoundError extends NotFoundError {
  private constructor(message: string) {
    super(message);
  }

  static forSlug(slug: Slug): CandidateNotFoundError {
    return new CandidateNotFoundError(
      `No candidate found for slug "${slug.value}"`,
    );
  }
}
