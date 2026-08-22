import { SvgAvatarPainter } from '../../../../../src/Cv/Infrastructure/Portrait/SvgAvatarPainter';
import { personaFixture } from '../../../../support/fixtures';

const render = async (name: {
  givenName: string;
  familyName: string;
}): Promise<string> => {
  const portrait = await new SvgAvatarPainter().paint(personaFixture(name));

  return new TextDecoder().decode(portrait.bytes);
};

describe('SvgAvatarPainter', () => {
  it('returns an SVG image tagged with its provider', async () => {
    const portrait = await new SvgAvatarPainter().paint(personaFixture());

    expect(portrait.mimeType).toBe('image/svg+xml');
    expect(portrait.provider).toBe('svg');
    expect(portrait.bytes.byteLength).toBeGreaterThan(100);
  });

  it('draws the initials', async () => {
    const svg = await render({ givenName: 'Ana', familyName: 'Ruiz' });

    expect(svg).toContain('>AR<');
    expect(svg).toContain('<svg');
    expect(svg).toContain('512');
  });

  it('is deterministic, so a regenerated corpus looks unchanged', async () => {
    const first = await render({ givenName: 'Ana', familyName: 'Ruiz' });
    const second = await render({ givenName: 'Ana', familyName: 'Ruiz' });

    expect(first).toBe(second);
  });

  it('gives different people different colours', async () => {
    const ana = await render({ givenName: 'Ana', familyName: 'Ruiz' });
    const mateo = await render({ givenName: 'Mateo', familyName: 'Castaño' });

    expect(ana).not.toBe(mateo);
  });

  it('escapes a name that would otherwise break the document', async () => {
    const svg = await render({
      givenName: 'Ana <script>',
      familyName: '"Ruiz" & Co',
    });

    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&amp;');
  });
});
