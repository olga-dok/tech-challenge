import type { CvTemplateId } from '@repo/contracts';
import type { CvDocumentRequest } from './CvDocument';
import { renderClassicTemplate } from './renderClassicTemplate';
import { renderHeaderBandTemplate } from './renderHeaderBandTemplate';
import { renderSidebarTemplate } from './renderSidebarTemplate';

const TEMPLATES: Record<CvTemplateId, (request: CvDocumentRequest) => string> =
  {
    classic: renderClassicTemplate,
    sidebar: renderSidebarTemplate,
    'header-band': renderHeaderBandTemplate,
  };

/**
 * The one place a template id becomes HTML. Pure: given the same profile it
 * returns the same document, which is what makes template work testable without
 * launching a browser or spending API quota.
 */
export function renderCvHtml(request: CvDocumentRequest): string {
  return TEMPLATES[request.templateId](request);
}
