import type { CandidateProfile } from '@repo/contracts';

/**
 * Puts a drafted profile into the order a CV is read in: most recent first.
 *
 * The prompt asks for reverse-chronological order, and the model mostly obliges
 * — mostly is the problem. A corpus where some CVs run oldest-first looks
 * careless on screen, and it is worse than cosmetic downstream: the chunker
 * treats each experience entry as its own chunk, so "what is this candidate
 * doing now?" retrieves whichever entry happens to be first.
 *
 * So the order is imposed here rather than hoped for. Sorting after validation
 * and before persistence means the stored `profileJson` — the corpus ground
 * truth — is already normalised, and every consumer (PDF, chunker, evaluation)
 * sees the same order.
 */
export function normaliseProfile(profile: CandidateProfile): CandidateProfile {
  return {
    ...profile,
    experience: [...profile.experience].sort(byMostRecentFirst),
    education: [...profile.education].sort(
      (left, right) => right.graduationYear - left.graduationYear,
    ),
  };
}

type Experience = CandidateProfile['experience'][number];

function byMostRecentFirst(left: Experience, right: Experience): number {
  // A null end date means "present", which outranks any finished role.
  const ended = rank(right.endDate) - rank(left.endDate);
  if (ended !== 0) {
    return ended;
  }

  const byEnd = compare(right.endDate, left.endDate);
  if (byEnd !== 0) {
    return byEnd;
  }

  // Two roles at the same company that ended together sort by when they began,
  // which is what an internal promotion looks like on a CV.
  return compare(right.startDate, left.startDate);
}

/** Current roles first; `YYYY-MM` strings compare correctly as strings. */
const rank = (endDate: string | null): number => (endDate === null ? 1 : 0);

const compare = (left: string | null, right: string | null): number => {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left < right ? -1 : 1;
};
