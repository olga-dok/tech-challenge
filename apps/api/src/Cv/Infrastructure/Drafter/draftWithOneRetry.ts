import { CandidateProfileSchema, type CandidateProfile } from '@repo/contracts';
import type { Logger } from '../../../Shared/Domain';
import type { Persona } from '../../Domain/Persona';
import { ProfileDraftingError } from '../../Domain/ProfileDraftingError';
import {
  buildProfilePrompt,
  buildRepairPrompt,
  type ProfilePrompt,
} from './buildProfilePrompt';
import { extractJsonObject } from './extractJsonObject';
import { normaliseProfile } from './normaliseProfile';

export type GenerateText = (prompt: ProfilePrompt) => Promise<string>;

/**
 * The validate-and-repair loop both text adapters share, so Gemini and
 * OpenRouter cannot drift apart in how strictly they check their own output.
 *
 * Exactly one repair attempt. A model that cannot satisfy the schema when shown
 * its own validation errors will not satisfy it on the fifth ask either, and on
 * a free tier every extra call is quota someone else's CV needed. The batch
 * pipeline treats one missing persona as survivable, so failing fast here is
 * cheaper than grinding.
 */
export async function draftWithOneRetry(
  persona: Persona,
  generate: GenerateText,
  logger?: Logger,
): Promise<CandidateProfile> {
  const prompt = buildProfilePrompt(persona);
  const first = await attempt(persona, prompt, generate);

  if (first.profile !== null) {
    return first.profile;
  }

  logger?.warn('Redrafting a profile with the validation errors fed back', {
    candidate: persona.fullName,
    issues: first.issues.length,
  });

  const repaired = await attempt(
    persona,
    buildRepairPrompt(prompt, first.raw, first.issues),
    generate,
  );

  if (repaired.profile !== null) {
    return repaired.profile;
  }

  throw ProfileDraftingError.forInvalidProfile(
    persona.fullName,
    repaired.issues,
  );
}

interface AttemptResult {
  readonly profile: CandidateProfile | null;
  readonly raw: string;
  readonly issues: readonly string[];
}

async function attempt(
  persona: Persona,
  prompt: ProfilePrompt,
  generate: GenerateText,
): Promise<AttemptResult> {
  const raw = await generate(prompt);
  const json = extractJsonObject(raw);

  if (json === null) {
    return {
      profile: null,
      raw,
      issues: ['the response contained no JSON object'],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error: unknown) {
    return {
      profile: null,
      raw,
      issues: [
        `the JSON was malformed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  const result = CandidateProfileSchema.safeParse(parsed);

  if (result.success) {
    // Ordered here, once, so the stored ground truth and everything derived from
    // it agree — rather than each template sorting for itself.
    return { profile: normaliseProfile(result.data), raw, issues: [] };
  }

  return {
    profile: null,
    raw,
    // Path plus message, which is what makes the repair prompt actionable:
    // "experience.0.startDate: must be a YYYY-MM month".
    issues: result.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    ),
  };
}
