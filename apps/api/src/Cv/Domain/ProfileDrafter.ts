// Type-only, so the domain layer keeps no runtime dependency while the profile
// shape stays defined once, in contracts.
import type { CandidateProfile } from '@repo/contracts';
import type { Persona } from './Persona';

/**
 * Turns a planned persona into the CV's content. The only place an LLM writes
 * prose in this pipeline; layout, PDF and indexing are all deterministic after
 * this point.
 */
export interface ProfileDrafter {
  draft(persona: Persona): Promise<CandidateProfile>;
}

export const ProfileDrafterId = Symbol('ProfileDrafter');
