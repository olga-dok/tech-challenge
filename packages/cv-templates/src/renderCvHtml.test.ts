import { CV_TEMPLATE_IDS, type CandidateProfile } from '@repo/contracts';
import type { CvDocumentRequest } from './CvDocument';
import { renderCvHtml } from './renderCvHtml';
import { sampleProfile } from './sampleProfile';

const PORTRAIT_URL = '/cvs/pablo-moreno/portrait';

const requestFor = (
  templateId: (typeof CV_TEMPLATE_IDS)[number],
  overrides: Partial<CandidateProfile> = {},
  language: 'en' | 'es' = 'en',
): CvDocumentRequest => ({
  profile: { ...sampleProfile(), ...overrides },
  templateId,
  language,
  portraitUrl: PORTRAIT_URL,
});

// Everything below runs against all three templates: a layout that quietly
// drops the education section is a layout that loses a candidate's UPC degree.
describe.each(CV_TEMPLATE_IDS)('%s template', (templateId) => {
  it('is a complete self-contained document', () => {
    const html = renderCvHtml(requestFor(templateId));

    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('@page');
    // Styles are inline, so a PDF render fetches nothing and the browser
    // preview needs no stylesheet plumbing. The portrait is the one external
    // reference, and the caller decides what it points at.
    expect(html).toContain(`src="${PORTRAIT_URL}"`);
  });

  it('renders every fact the profile carries', () => {
    const profile = sampleProfile();
    const html = renderCvHtml(requestFor(templateId));

    expect(html).toContain(profile.fullName);
    expect(html).toContain(profile.headline);
    expect(html).toContain(profile.summary);
    expect(html).toContain(profile.contact.email);
    expect(html).toContain(profile.experience[0].company);
    expect(html).toContain(profile.experience[0].bullets[0]);
    expect(html).toContain(profile.education[0].institution);
    for (const skill of profile.skills) {
      expect(html).toContain(skill);
    }
  });

  it('keeps entries off page boundaries', () => {
    // A job split across a page break becomes a chunk that starts mid-sentence.
    expect(renderCvHtml(requestFor(templateId))).toContain(
      'page-break-inside: avoid',
    );
  });

  it('never emits positive letter-spacing, which the extractor cannot read back', () => {
    const html = renderCvHtml(requestFor(templateId));

    // Chromium emits a tracked run glyph by glyph, so "HABILIDADES" comes back
    // out as "H A B I L I D A D E S" and no section pattern matches it.
    expect(html).not.toMatch(/letter-spacing:\s*[0-9]/);
  });

  it('escapes the portrait URL as well, since it can come from a request', () => {
    const html = renderCvHtml({
      ...requestFor(templateId),
      portraitUrl: '/p.jpg" onerror="alert(1)',
    });

    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain('&quot;');
  });

  it('escapes model-written text instead of trusting it', () => {
    const html = renderCvHtml(
      requestFor(templateId, {
        fullName: 'Ana <script>alert(1)</script> Ruiz',
        headline: 'Engineer & "Architect"',
      }),
    );

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Engineer &amp; &quot;Architect&quot;');
  });

  it('labels sections in English and formats dates for it', () => {
    const html = renderCvHtml(requestFor(templateId, {}, 'en'));

    expect(html).toContain('Experience');
    expect(html).toContain('Education');
    expect(html).toContain('Jan 2021 – Present');
  });

  it('labels sections in Spanish for a Spanish CV', () => {
    const html = renderCvHtml(requestFor(templateId, {}, 'es'));

    // These exact words are what the chunker looks for; an English heading on a
    // Spanish CV is a mis-sectioned chunk and a wrong citation.
    expect(html).toContain('Experiencia');
    expect(html).toContain('Educación');
    expect(html).toContain('ene 2021 – Actualidad');
  });

  it('translates the language proficiency too', () => {
    const spanish = renderCvHtml(
      requestFor(
        templateId,
        { languages: [{ language: 'Español', level: 'NATIVE' }] },
        'es',
      ),
    );
    const english = renderCvHtml(
      requestFor(
        templateId,
        { languages: [{ language: 'Spanish', level: 'NATIVE' }] },
        'en',
      ),
    );

    expect(spanish).toContain('nativo');
    expect(spanish).not.toContain('native');
    expect(english).toContain('native');
  });

  it('omits the certifications heading when there are none', () => {
    const withNone = renderCvHtml(
      requestFor(templateId, { certifications: [] }),
    );
    const withSome = renderCvHtml(
      requestFor(templateId, {
        certifications: ['AWS Certified Data Engineer'],
      }),
    );

    expect(withNone).not.toContain('Certifications');
    expect(withSome).toContain('Certifications');
    expect(withSome).toContain('AWS Certified Data Engineer');
  });

  it('is deterministic', () => {
    expect(renderCvHtml(requestFor(templateId))).toBe(
      renderCvHtml(requestFor(templateId)),
    );
  });
});

describe('renderCvHtml', () => {
  it('gives the three templates genuinely different documents', () => {
    const [classic, sidebar, band] = CV_TEMPLATE_IDS.map((id): string =>
      renderCvHtml(requestFor(id)),
    );

    expect(new Set([classic, sidebar, band]).size).toBe(3);
  });
});
