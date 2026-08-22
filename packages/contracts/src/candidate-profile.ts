import { z } from 'zod';
import { LanguageLevelSchema } from './enums';

/**
 * The LLM's structured-output target, and afterwards the corpus ground truth:
 * the same validated object renders the PDF and, at evaluation time, tells us
 * which candidates *should* come back for "who knows Kubernetes?".
 *
 * Two constraints follow from that first role, and explain what looks missing:
 *   * every field must survive the trip through a JSON schema, so there are no
 *     transforms, unions or refinements here — just objects, arrays, enums and
 *     scalars a model can be asked for.
 *   * absent values are `null`, never optional. A required-but-nullable key is
 *     something structured output reliably produces; an omitted key is what it
 *     silently does instead of admitting it has nothing.
 */

/** `YYYY-MM`. Month precision is what CVs actually state, and it sorts as a string. */
const YearMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be a YYYY-MM month');

export const ContactSchema = z.object({
  // Plain strings, not `z.email()`: this is a fake address on a fake CV, and a
  // `format` keyword is the kind of thing a free model's structured-output
  // implementation quietly ignores — leaving a retry loop over a non-problem.
  email: z.string().min(3),
  phone: z.string().min(3),
  location: z.string().min(2),
  linkedin: z.string().nullable(),
});
export type Contact = z.infer<typeof ContactSchema>;

export const ExperienceEntrySchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  startDate: YearMonthSchema,
  /** `null` means "present" — the current role, which every corpus needs some of. */
  endDate: YearMonthSchema.nullable(),
  location: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1).max(6),
});
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;

export const EducationEntrySchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().min(1),
  graduationYear: z.number().int().min(1960).max(2035),
  location: z.string().min(1),
});
export type EducationEntry = z.infer<typeof EducationEntrySchema>;

export const LanguageProficiencySchema = z.object({
  language: z.string().min(2),
  level: LanguageLevelSchema,
});
export type LanguageProficiency = z.infer<typeof LanguageProficiencySchema>;

export const CandidateProfileSchema = z.object({
  fullName: z.string().min(2),
  headline: z.string().min(4),
  contact: ContactSchema,
  summary: z.string().min(40),
  // The caps are the PDF's constraint, not the model's taste: the templates are
  // laid out for one or two A4 pages and an eleven-job history overflows them.
  experience: z.array(ExperienceEntrySchema).min(1).max(8),
  education: z.array(EducationEntrySchema).min(1).max(3),
  skills: z.array(z.string().min(1)).min(3).max(20),
  languages: z.array(LanguageProficiencySchema).min(1).max(4),
  certifications: z.array(z.string().min(1)).max(5),
});
export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;
