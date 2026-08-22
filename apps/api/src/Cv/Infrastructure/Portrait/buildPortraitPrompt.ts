import type { Persona } from '../../Domain/Persona';

/**
 * A portrait prompt built from what the plan decided about this person — career
 * stage and gender — and nothing it did not.
 *
 * Gender is stated because a CV for Hugo Hendriks with a woman's photograph is
 * incoherent, and it comes from the persona rather than from a guess at the
 * name. Nothing here infers ethnicity or appearance from a name or a city: that
 * would be both unreliable and offensive, and a professional headshot does not
 * need it.
 *
 * The photographic vocabulary is doing real work. Image models default to
 * illustration when a prompt does not insist otherwise, and the first corpus
 * came back as stylised anime portraits — camera and lighting language plus an
 * explicit rejection of illustration is what turns that into a photograph.
 */
export function buildPortraitPrompt(persona: Persona): string {
  return [
    `candid corporate headshot photograph of a ${ageBand(persona)} ${subject(persona)}`,
    'real person, photorealistic, shot on a DSLR with an 85mm lens at f/2, natural skin texture and pores, soft studio key light',
    'plain light grey seamless background',
    'head and shoulders, facing the camera, neutral friendly expression, business casual clothing',
    'sharp focus on the eyes, subtle depth of field',
    // The negatives are not decoration: without them SANA and FLUX both drift
    // straight back to illustration.
    'not an illustration, not anime, not manga, not a painting, not a 3d render, not CGI, no airbrushing, no text, no watermark, no logo, no border, no frame',
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

function subject(persona: Persona): string {
  const noun = persona.gender === 'female' ? 'woman' : 'man';
  const flavour =
    persona.roleFamily === 'DESIGN' || persona.roleFamily === 'PRODUCT'
      ? 'creative professional'
      : 'software professional';

  return `${noun}, a ${flavour}`;
}

/** Read off years of experience rather than invented: a junior is not forty. */
function ageBand(persona: Persona): string {
  if (persona.yearsExperience <= 3) {
    return 'mid-twenties';
  }

  return persona.yearsExperience <= 10 ? 'mid-thirties' : 'mid-forties';
}
