import type {
  CandidateProfile,
  CvLanguage,
  CvTemplateId,
} from '@repo/contracts';
import type { PortraitImage } from './PortraitPainter';

export interface CvRenderRequest {
  readonly profile: CandidateProfile;
  readonly portrait: PortraitImage;
  readonly templateId: CvTemplateId;
  /**
   * Section headings have to be in the CV's own language: the chunker detects
   * "Experiencia" as well as "Experience", and a Spanish CV under English
   * headings would be mis-sectioned at ingestion — invisible in the PDF, wrong
   * in every citation.
   */
  readonly language: CvLanguage;
}

/**
 * Layout is code. The model writes the words; this turns them into the same
 * document every time, which is what makes a bad PDF debuggable instead of a
 * matter of re-rolling the dice.
 */
export interface PdfRenderer {
  render(request: CvRenderRequest): Promise<Uint8Array>;
}

export const PdfRendererId = Symbol('PdfRenderer');
