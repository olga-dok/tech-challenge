import type { CvDocumentRequest } from './CvDocument';
import { documentShell } from './sharedStyles';
import {
  escapeHtml,
  formatDateRange,
  formatLanguageLevel,
  vocabularyFor,
} from './templateText';

const STYLES = `
  .layout { display: flex; gap: 14pt; align-items: flex-start; }
  .sidebar { width: 150pt; flex: 0 0 150pt; }
  .main { flex: 1; }
  .sidebar .portrait { width: 100%; height: 130pt; }
  .side-block { margin-top: 10pt; }
  .side-title { font-size: 8.6pt; text-transform: uppercase; color: #35506b; margin-bottom: 3pt; }
  .side-item { font-size: 9pt; margin-bottom: 2pt; word-break: break-word; }
  .name { font-size: 19pt; }
  .headline { font-size: 10.6pt; color: #3d4b5a; margin: 2pt 0 8pt; }
  .section { margin-top: 10pt; }
  .section-title { font-size: 9.5pt; text-transform: uppercase; color: #1f2933; border-bottom: 1pt solid #1f2933; padding-bottom: 2pt; margin-bottom: 5pt; }
  .entry { margin-bottom: 8pt; }
  .entry-role { font-weight: 600; }
  .entry-meta { font-size: 8.8pt; color: #5c6b7a; }
`;

/**
 * Two columns. Deliberately in the mix because a sidebar is the layout that
 * makes naive PDF extraction interleave columns — the corpus should contain the
 * hard case, not just the easy one.
 */
export function renderSidebarTemplate(request: CvDocumentRequest): string {
  const { profile, language } = request;
  const words = vocabularyFor(language);

  const sideItems = [
    profile.contact.email,
    profile.contact.phone,
    profile.contact.location,
    profile.contact.linkedin,
  ].filter((value): value is string => value !== null && value.length > 0);

  const body = `
    <div class="layout">
      <aside class="sidebar">
        <img class="portrait" src="${escapeHtml(request.portraitUrl)}" alt="${escapeHtml(profile.fullName)}">

        <div class="side-block">
          <div class="side-title">${words.contact}</div>
          ${sideItems.map((item) => `<div class="side-item">${escapeHtml(item)}</div>`).join('')}
        </div>

        <div class="side-block">
          <div class="side-title">${words.skills}</div>
          ${profile.skills.map((skill) => `<div class="side-item">${escapeHtml(skill)}</div>`).join('')}
        </div>

        <div class="side-block">
          <div class="side-title">${words.languages}</div>
          ${profile.languages
            .map(
              (entry) =>
                `<div class="side-item">${escapeHtml(entry.language)} — ${escapeHtml(formatLanguageLevel(entry.level, language))}</div>`,
            )
            .join('')}
        </div>

        ${
          profile.certifications.length === 0
            ? ''
            : `<div class="side-block">
          <div class="side-title">${words.certifications}</div>
          ${profile.certifications.map((cert) => `<div class="side-item cert">${escapeHtml(cert)}</div>`).join('')}
        </div>`
        }
      </aside>

      <main class="main">
        <h1 class="name">${escapeHtml(profile.fullName)}</h1>
        <div class="headline">${escapeHtml(profile.headline)}</div>

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
              <div class="entry-role">${escapeHtml(job.role)}</div>
              <div class="entry-meta">${escapeHtml(job.company)} · ${escapeHtml(job.location)} · ${escapeHtml(formatDateRange(job.startDate, job.endDate, language))}</div>
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
              <div class="entry-meta">${escapeHtml(entry.institution)} · ${escapeHtml(entry.location)} · ${String(entry.graduationYear)}</div>
            </div>`,
            )
            .join('')}
        </div>
      </main>
    </div>
  `;

  return documentShell(escapeHtml(profile.fullName), STYLES, body);
}
