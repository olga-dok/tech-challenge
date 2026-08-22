import type { CandidateSummaryDto } from '@repo/contracts';
import type { Candidate } from '../Domain/Candidate';

/**
 * The card the gallery draws.
 *
 * URLs are API-relative rather than absolute: the web app proxies them, so it
 * never needs to know the API's origin and the browser never needs CORS.
 */
export function toCandidateSummary(candidate: Candidate): CandidateSummaryDto {
  return {
    // A summary is only built from a persisted candidate, which always has an id.
    id: candidate.id ?? '',
    slug: candidate.slug.value,
    fullName: candidate.fullName,
    headline: candidate.headline,
    location: candidate.location,
    topSkills: candidate.topSkills(),
    yearsExperience: candidate.persona.yearsExperience,
    seniority: candidate.persona.seniority,
    portraitUrl: `/cvs/${candidate.slug.value}/portrait`,
    pdfUrl: `/cvs/${candidate.slug.value}/pdf`,
  };
}
