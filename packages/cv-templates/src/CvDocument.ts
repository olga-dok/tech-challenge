import type {
  CandidateProfile,
  CvLanguage,
  CvTemplateId,
} from '@repo/contracts';

export interface CvDocumentRequest {
  readonly profile: CandidateProfile;
  readonly templateId: CvTemplateId;
  /**
   * Section headings have to be in the CV's own language: the chunker detects
   * "Experiencia" as well as "Experience", and a Spanish CV under English
   * headings is mis-sectioned at ingestion — invisible in the PDF, wrong in
   * every citation.
   */
  readonly language: CvLanguage;
  /**
   * Anything an `<img src>` accepts. A string rather than bytes is what keeps
   * this package platform-neutral: the API passes a `data:` URI built from the
   * painted portrait, the web app passes the portrait endpoint's URL. Nothing
   * here needs Node's Buffer.
   */
  readonly portraitUrl: string;
}
