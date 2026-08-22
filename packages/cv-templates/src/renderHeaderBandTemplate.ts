import type { CvDocumentRequest } from './CvDocument';
import { documentShell } from './sharedStyles';
import {
  escapeHtml,
  formatDateRange,
  formatLanguageLevel,
  vocabularyFor,
} from './templateText';

/**
 * A coloured header band, which is why `printBackground` has to be on in the
 * renderer — with it off this template silently prints as white-on-white.
 */
const STYLES = `
  @page { margin: 0 0 14mm; }

  .band {
    background: #1f3a54;
    color: #ffffff;
    padding: 16pt 14mm 14pt;
    display: flex;
    gap: 12pt;
    align-items: center;
  }
  .band .portrait { width: 70pt; height: 70pt; border: 1.6pt solid rgba(255,255,255,0.75); }
  .band .name { font-size: 21pt; letter-spacing: -0.3pt; }
  .band .headline { font-size: 10.6pt; color: #d3dfeb; margin-top: 2pt; }
  .band .contact { font-size: 8.6pt; color: #b9cadb; margin-top: 5pt; }

  .content { padding: 0 14mm; }
  .section { margin-top: 11pt; }
  .section-title { font-size: 9.6pt; font-weight: 700; text-transform: uppercase; color: #1f3a54; margin-bottom: 5pt; }
  .rule { height: 2pt; width: 34pt; background: #1f3a54; margin-bottom: 6pt; }
  .entry { margin-bottom: 8pt; }
  .entry-head { display: flex; justify-content: space-between; gap: 10pt; }
  .entry-role { font-weight: 600; }
  .grid { display: flex; gap: 14pt; }
  .grid > div { flex: 1; }
`;

export function renderHeaderBandTemplate(request: CvDocumentRequest): string {
  const { profile, language } = request;
  const words = vocabularyFor(language);
  const contact = [
    profile.contact.email,
    profile.contact.phone,
    profile.contact.location,
    profile.contact.linkedin,
  ]
    .filter((value): value is string => value !== null && value.length > 0)
    .map(escapeHtml)
    .join(' · ');

  const body = `
    <div class="band">
      <img class="portrait" src="${escapeHtml(request.portraitUrl)}" alt="${escapeHtml(profile.fullName)}">
      <div>
        <h1 class="name">${escapeHtml(profile.fullName)}</h1>
        <div class="headline">${escapeHtml(profile.headline)}</div>
        <div class="contact">${contact}</div>
      </div>
    </div>

    <div class="content">
      <div class="section">
        <h2 class="section-title">${words.summary}</h2>
        <div class="rule"></div>
        <p style="margin:0">${escapeHtml(profile.summary)}</p>
      </div>

      <div class="section">
        <h2 class="section-title">${words.experience}</h2>
        <div class="rule"></div>
        ${profile.experience
          .map(
            (job) => `
          <div class="entry">
            <div class="entry-head">
              <div><span class="entry-role">${escapeHtml(job.role)}</span> — ${escapeHtml(job.company)}</div>
              <div class="muted tiny">${escapeHtml(formatDateRange(job.startDate, job.endDate, language))}</div>
            </div>
            <div class="muted tiny">${escapeHtml(job.location)}</div>
            <ul>${job.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>
          </div>`,
          )
          .join('')}
      </div>

      <div class="grid">
        <div class="section">
          <h2 class="section-title">${words.education}</h2>
          <div class="rule"></div>
          ${profile.education
            .map(
              (entry) => `
            <div class="education-entry">
              <strong>${escapeHtml(entry.degree)} — ${escapeHtml(entry.field)}</strong>
              <div class="muted tiny">${escapeHtml(entry.institution)} · ${String(entry.graduationYear)}</div>
            </div>`,
            )
            .join('')}
        </div>

        <div class="section">
          <h2 class="section-title">${words.languages}</h2>
          <div class="rule"></div>
          ${profile.languages
            .map(
              (entry) =>
                `<div>${escapeHtml(entry.language)} — ${escapeHtml(formatLanguageLevel(entry.level, language))}</div>`,
            )
            .join('')}
          ${
            profile.certifications.length === 0
              ? ''
              : `<h2 class="section-title" style="margin-top:9pt">${words.certifications}</h2>
                 <div class="rule"></div>
                 ${profile.certifications.map((cert) => `<div class="cert">${escapeHtml(cert)}</div>`).join('')}`
          }
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">${words.skills}</h2>
        <div class="rule"></div>
        <div class="chips">${profile.skills.map((skill) => `<span class="chip">${escapeHtml(skill)}</span>`).join('')}</div>
      </div>
    </div>
  `;

  return documentShell(escapeHtml(profile.fullName), STYLES, body);
}
