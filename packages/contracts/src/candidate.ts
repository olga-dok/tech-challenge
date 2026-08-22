import { z } from 'zod';
import { SenioritySchema } from './enums';
import { paginatedSchema } from './pagination';
import { SlugSchema } from './primitives';

/**
 * Everything a gallery card renders, and nothing else — the full profile is a
 * second request. Thirty cards on screen is thirty portraits and thirty skill
 * lists; sending the whole `profileJson` for each would be most of a megabyte
 * to draw a name and three chips.
 */
export const CandidateSummarySchema = z.object({
  id: z.uuid(),
  slug: SlugSchema,
  fullName: z.string().min(2),
  headline: z.string().min(4),
  location: z.string().min(2),
  topSkills: z.array(z.string().min(1)).max(5),
  yearsExperience: z.number().int().min(0),
  seniority: SenioritySchema,
  /** API-relative paths, so the web app can proxy them without knowing the API origin. */
  portraitUrl: z.string().min(1),
  pdfUrl: z.string().min(1),
});
export type CandidateSummaryDto = z.infer<typeof CandidateSummarySchema>;

export const CandidatePageSchema = paginatedSchema(CandidateSummarySchema);
export type CandidatePageDto = z.infer<typeof CandidatePageSchema>;
