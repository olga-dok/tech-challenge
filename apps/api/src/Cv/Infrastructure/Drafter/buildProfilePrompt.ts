import type { Persona } from '../../Domain/Persona';

export interface ProfilePrompt {
  readonly system: string;
  readonly user: string;
}

const LANGUAGE_NAMES = { en: 'English', es: 'Spanish' } as const;

/**
 * The prompt is where corpus quality is won or lost, so it states the persona as
 * facts to be honoured rather than inspiration to be riffed on.
 *
 * The prohibitions are not boilerplate. Left to itself a model populates a fake
 * CV with real employers and public figures (a legal problem and an evaluation
 * problem — "who worked at Google?" stops testing retrieval), and falls back on
 * "XYZ Corp" and "Lorem ipsum" when it runs out of invention, which reads as
 * obviously synthetic in a screen recording.
 */
export function buildProfilePrompt(persona: Persona): ProfilePrompt {
  const language = LANGUAGE_NAMES[persona.cvLanguage];

  const system = [
    'You write realistic fake CV content for a recruitment-tool demo corpus.',
    'Return ONLY a JSON object matching the requested schema. No prose, no code fences.',
    '',
    'Hard rules:',
    `- Write every field in ${language}, including job titles and bullet points. Keep names and the university as given.`,
    '- Where the language inflects for gender, match the gender given for this person.',
    '- Invent the person and every employer. Never use a real company, a real public figure, or a recognisable brand.',
    '- Never use placeholder text: no "Lorem ipsum", "XYZ Corp", "Company A", "TBD", "example.com", "N/A".',
    '- Employer names must be plausible small-to-mid companies, distinct from each other.',
    '- Dates are YYYY-MM. Roles must not overlap, and only the current role may have a null end date.',
    '- List experience in reverse-chronological order: the current or most recent role FIRST, the oldest role LAST. Education likewise, newest first.',
    '- Total experience must add up to roughly the stated years.',
    '- Bullets are concrete and specific: what was built, with what, and the effect. Include real numbers. No generic filler like "passionate about clean code" or "team player".',
    '- The summary must reflect the distinctive traits below. They are biography, not decoration.',
  ].join('\n');

  const user = [
    'Write the CV content for this person.',
    '',
    `Name: ${persona.fullName} (${persona.gender})`,
    `Target role: ${persona.role} (${persona.seniority.toLowerCase()}, ${persona.roleFamily.replace('_', ' ').toLowerCase()})`,
    `Industry: ${persona.industry}`,
    `Based in: ${persona.city}, ${persona.country}`,
    `Years of experience: ${String(persona.yearsExperience)}`,
    `Studied at: ${persona.university}`,
    `Mother tongue: ${persona.primaryLanguage}`,
    `CV language: ${language}`,
    '',
    'Distinctive traits that must be visible in the CV:',
    ...persona.distinctiveTraits.map((trait) => `- ${trait}`),
    '',
    `Contact details should be fictional and consistent with ${persona.city}.`,
  ].join('\n');

  return { system, user };
}

/**
 * The second attempt. Feeding the model its own validation errors is far more
 * effective than asking again with the same prompt — the usual failure is one
 * malformed date or a missing key, and shown the specific complaint it fixes it.
 */
export function buildRepairPrompt(
  prompt: ProfilePrompt,
  invalidResponse: string,
  issues: readonly string[],
): ProfilePrompt {
  return {
    system: prompt.system,
    user: [
      prompt.user,
      '',
      'Your previous answer was rejected by the schema validator:',
      ...issues.map((issue) => `- ${issue}`),
      '',
      'Here is what you sent:',
      invalidResponse.slice(0, 2_000),
      '',
      'Return the corrected JSON object only. Fix exactly these problems and change nothing else.',
    ].join('\n'),
  };
}
