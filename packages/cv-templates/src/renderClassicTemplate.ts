import type { CvDocumentRequest } from './CvDocument';
import { documentShell } from './sharedStyles';
import {
  escapeHtml,
  formatDateRange,
  formatLanguageLevel,
  vocabularyFor,
} from './templateText';

const STYLES = `
  .header { display: flex; gap: 12pt; align-items: center; border-bottom: 1.4pt solid #1f2933; padding-bottom: 9pt; }
  .header .portrait { width: 74pt; height: 74pt; }
  .name { font-size: 20pt; letter-spacing: -0.3pt; }
  .headline { font-size: 11pt; color: #3d4b5a; margin-top: 2pt; }
  .contact-line { margin-top: 4pt; font-size: 8.8pt; color: #5c6b7a; }
  .section { margin-top: 11pt; }
  .section-title { font-size: 9.5pt; text-transform: uppercase; color: #35506b; border-bottom: 0.6pt solid #dbe2e9; padding-bottom: 2.5pt; margin-bottom: 6pt; }
  .entry { margin-bottom: 8pt; }
  .entry-head { display: flex; justify-content: space-between; gap: 10pt; }
  .entry-role { font-weight: 600; }
  .entry-company { color: #35506b; }
  .education-entry { margin-bottom: 5pt; }
`;

/** Single column, portrait in the header. The layout a recruiter expects. */
export function renderClassicTemplate(request: CvDocumentRequest): string {
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
    <div class="header">
      <img class="portrait" src="${escapeHtml(request.portraitUrl)}" alt="${escapeHtml(profile.fullName)}">
      <div>
        <h1 class="name">${escapeHtml(profile.fullName)}</h1>
        <div class="headline">${escapeHtml(profile.headline)}</div>
        <div class="contact-line">${contact}</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">${words.summary}</h2>
      <p style="margin:0">${escapeHtml(profile.summary)}</p>
    </div>

    <div class="section">
      <h2 class="section-title">${words.experience}</h2>
      ${profile.experience
        .map(
          (job) => `
        <div class="entry">
          <div class="entry-head">
            <div>
              <span class="entry-role">${escapeHtml(job.role)}</span>,
              <span class="entry-company">${escapeHtml(job.company)}</span>
            </div>
            <div class="muted tiny">${escapeHtml(formatDateRange(job.startDate, job.endDate, language))}</div>
          </div>
          <div class="muted tiny">${escapeHtml(job.location)}</div>
          <ul>${job.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>
        </div>`,
        )
        .join('')}
    </div>

    <div class="section">
      <h2 class="section-title">${words.education}</h2>
      ${profile.education
        .map(
          (entry) => `
        <div class="education-entry">
          <strong>${escapeHtml(entry.degree)} — ${escapeHtml(entry.field)}</strong>
          <div class="muted tiny">${escapeHtml(entry.institution)} · ${escapeHtml(entry.location)} · ${String(entry.graduationYear)}</div>
        </div>`,
        )
        .join('')}
    </div>

    <div class="section">
      <h2 class="section-title">${words.skills}</h2>
      <div class="chips">${profile.skills.map((skill) => `<span class="chip">${escapeHtml(skill)}</span>`).join('')}</div>
    </div>

    <div class="section">
      <h2 class="section-title">${words.languages}</h2>
      <div>${profile.languages.map((entry) => `${escapeHtml(entry.language)} (${escapeHtml(formatLanguageLevel(entry.level, language))})`).join(' · ')}</div>
    </div>

    ${
      profile.certifications.length === 0
        ? ''
        : `<div class="section">
      <h2 class="section-title">${words.certifications}</h2>
      <ul>${profile.certifications.map((cert) => `<li class="cert">${escapeHtml(cert)}</li>`).join('')}</ul>
    </div>`
    }
  `;

  return documentShell(escapeHtml(profile.fullName), STYLES, body);
}
