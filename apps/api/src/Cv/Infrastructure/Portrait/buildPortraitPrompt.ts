import type { Persona } from '../../Domain/Persona';

/**
 * A portrait prompt built from what the persona actually states — career stage
 * and role — and nothing it does not. There is no inference about ethnicity or
 * appearance from a name or a city: guessing would be both wrong and offensive,
 * and a neutral professional headshot is what a CV needs anyway.
 */
export function buildPortraitPrompt(persona: Persona): string {
  return [
    `professional corporate headshot photograph of a ${ageBand(persona)} ${roleFlavour(persona)}`,
    'neutral light grey studio background',
    'soft even lighting, sharp focus, shoulders up, looking at the camera',
    'business casual clothing, friendly neutral expression',
    'photorealistic, no text, no watermark, no logo, no border',
  ].join(', ');
}

/**
 * Deterministic per candidate, so a regenerated corpus yields the same faces and
 * a re-run does not look like a different set of people.
 */
export function portraitSeed(persona: Persona): number {
  let hash = 2_166_136_261;

  for (const character of `${persona.fullName}|${persona.city}`) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }

  return Math.abs(hash) % 1_000_000;
}

function ageBand(persona: Persona): string {
  if (persona.yearsExperience <= 3) {
    return 'young adult';
  }

  return persona.yearsExperience <= 10 ? 'adult' : 'middle-aged adult';
}

function roleFlavour(persona: Persona): string {
  return persona.roleFamily === 'DESIGN' || persona.roleFamily === 'PRODUCT'
    ? 'creative professional'
    : 'software professional';
}
