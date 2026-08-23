import { CandidateNotFoundError } from '../Domain/CandidateNotFoundError';
import type { Candidate } from '../Domain/Candidate';
import type { CvRepository } from '../Domain/CvRepository';
import type { Slug } from '../Domain/Slug';

/**
 * Returns the full `Candidate`, not just the profile, so the portrait and PDF
 * actions can share this one "fetch or 404" use case instead of each
 * duplicating the lookup.
 */
export class GetCandidateUseCase {
  constructor(private readonly repository: CvRepository) {}

  async execute(slug: Slug): Promise<Candidate> {
    const candidate = await this.repository.findBySlug(slug);

    if (candidate === null) {
      throw CandidateNotFoundError.forSlug(slug);
    }

    return candidate;
  }
}
