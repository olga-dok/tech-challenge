import { z } from 'zod';

/**
 * The enums are UPPERCASE to match the Prisma enums character for character, so
 * a database row crosses the API boundary without a translation table in
 * between. Display casing is the UI's business.
 */

export const CvSectionSchema = z.enum([
  'SUMMARY',
  'EXPERIENCE',
  'EDUCATION',
  'SKILLS',
  'LANGUAGES',
  'CONTACT',
  'OTHER',
]);
export type CvSection = z.infer<typeof CvSectionSchema>;
export const CV_SECTIONS = CvSectionSchema.options;

export const SenioritySchema = z.enum(['JUNIOR', 'MID', 'SENIOR']);
export type Seniority = z.infer<typeof SenioritySchema>;
export const SENIORITIES = SenioritySchema.options;

/**
 * Seven families, because the corpus planner guarantees a spread across at
 * least five of them — a corpus of 30 backend engineers makes every retrieval
 * question look easy.
 */
export const RoleFamilySchema = z.enum([
  'BACKEND',
  'FRONTEND',
  'DATA',
  'MACHINE_LEARNING',
  'DEVOPS',
  'DESIGN',
  'PRODUCT',
]);
export type RoleFamily = z.infer<typeof RoleFamilySchema>;
export const ROLE_FAMILIES = RoleFamilySchema.options;

export const LanguageLevelSchema = z.enum([
  'NATIVE',
  'FLUENT',
  'ADVANCED',
  'INTERMEDIATE',
  'BASIC',
]);
export type LanguageLevel = z.infer<typeof LanguageLevelSchema>;
export const LANGUAGE_LEVELS = LanguageLevelSchema.options;

/**
 * Which layout a CV was rendered with. Lives here because it crosses the
 * boundary three ways: the api stores it on the candidate row, the renderer
 * picks a template by it, and the web app renders the same templates in the
 * browser.
 */
export const CvTemplateIdSchema = z.enum(['classic', 'sidebar', 'header-band']);
export type CvTemplateId = z.infer<typeof CvTemplateIdSchema>;
export const CV_TEMPLATE_IDS = CvTemplateIdSchema.options;

export const isCvTemplateId = (value: string): value is CvTemplateId =>
  CvTemplateIdSchema.safeParse(value).success;

/**
 * The language a CV is written in — not the candidate's mother tongue. Drives
 * the section headings, which the chunker matches on, so both sides of that
 * contract read the same list.
 */
export const CvLanguageSchema = z.enum(['en', 'es']);
export type CvLanguage = z.infer<typeof CvLanguageSchema>;
export const CV_LANGUAGES = CvLanguageSchema.options;
