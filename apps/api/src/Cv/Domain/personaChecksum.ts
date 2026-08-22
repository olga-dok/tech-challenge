import type { Persona } from './Persona';

/**
 * A stable fingerprint of everything that defines a persona.
 *
 * This is what makes generation resumable: a run that dies at batch four is
 * finished by clicking Generate again, because every persona already in the
 * database is recognised and skipped. Change any attribute and the checksum
 * changes, so an edited catalogue regenerates instead of silently keeping stale
 * CVs.
 *
 * Not cryptographic, and does not need to be — it identifies at most forty
 * locally generated records and nothing trusts it as a signature. Two
 * independent FNV-1a passes give 64 bits, far past collision risk at that scale,
 * and keep `node:crypto` out of the domain layer.
 */
export function personaChecksum(persona: Persona): string {
  const identity = [
    persona.givenName,
    persona.familyName,
    persona.gender,
    persona.roleFamily,
    persona.role,
    persona.seniority,
    persona.industry,
    persona.city,
    persona.country,
    persona.primaryLanguage,
    persona.cvLanguage,
    persona.university,
    String(persona.yearsExperience),
    ...persona.distinctiveTraits,
  ].join(' ');

  return `${fnv1a(identity, 2_166_136_261)}${fnv1a(identity, 40_389_413)}`;
}

function fnv1a(value: string, seed: number): string {
  let hash = seed >>> 0;

  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
}
