// Type-only: the id list itself is a contract, shared with the renderer package
// and the web app.
import { CV_TEMPLATE_IDS, type CvTemplateId } from '@repo/contracts';
import type { Persona } from './Persona';

/**
 * Which of the three layouts a candidate gets.
 *
 * Derived from the name rather than dealt from a deck, so it survives the plan:
 * the same candidate keeps the same layout across runs, and a corpus generated
 * in two sessions still looks like one corpus.
 *
 * The layouts themselves live in `@repo/cv-templates`, because the web app
 * renders the same documents in the browser.
 */
export function templateIdFor(persona: Persona): CvTemplateId {
  let hash = 2_166_136_261;

  for (const character of persona.fullName) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }

  return CV_TEMPLATE_IDS[Math.abs(hash) % CV_TEMPLATE_IDS.length];
}
