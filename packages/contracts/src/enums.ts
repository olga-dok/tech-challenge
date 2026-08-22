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
