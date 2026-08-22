import type { Persona } from '../../Domain/Persona';
import type {
  PortraitImage,
  PortraitPainter,
} from '../../Domain/PortraitPainter';

const PALETTE = [
  { background: '#dbeafe', foreground: '#1e3a8a' },
  { background: '#dcfce7', foreground: '#14532d' },
  { background: '#fef3c7', foreground: '#78350f' },
  { background: '#fae8ff', foreground: '#581c87' },
  { background: '#ffe4e6', foreground: '#881337' },
  { background: '#cffafe', foreground: '#164e63' },
] as const;

export const SVG_AVATAR_PROVIDER = 'svg';

/**
 * The end of the fallback chain, and the reason a CV can never be lost to a slow
 * image service: initials on a hashed pastel background, generated in-process
 * from the name alone.
 *
 * No network, no key, no failure mode. Deterministic too — the same candidate
 * always gets the same colour, so a regenerated corpus looks unchanged.
 */
export class SvgAvatarPainter implements PortraitPainter {
  paint(persona: Persona): Promise<PortraitImage> {
    const initials =
      `${persona.givenName[0] ?? ''}${persona.familyName[0] ?? ''}`.toUpperCase();
    const colours = PALETTE[hash(persona.fullName) % PALETTE.length];

    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img">',
      `<title>${escapeXml(persona.fullName)}</title>`,
      `<rect width="512" height="512" fill="${colours.background}"/>`,
      `<circle cx="256" cy="256" r="196" fill="${colours.background}" stroke="${colours.foreground}" stroke-opacity="0.18" stroke-width="4"/>`,
      `<text x="256" y="256" fill="${colours.foreground}" font-family="Helvetica, Arial, sans-serif" font-size="180" font-weight="600" text-anchor="middle" dominant-baseline="central">${escapeXml(initials)}</text>`,
      '</svg>',
    ].join('');

    return Promise.resolve({
      bytes: new TextEncoder().encode(svg),
      mimeType: 'image/svg+xml',
      provider: SVG_AVATAR_PROVIDER,
    });
  }
}

function hash(value: string): number {
  let result = 2_166_136_261;

  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16_777_619);
  }

  return Math.abs(result);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
