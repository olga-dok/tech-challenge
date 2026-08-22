import type { CvLanguage, LanguageLevel } from '@repo/contracts';

/**
 * Everything the templates put on the page that the model did not write.
 *
 * The headings are the load-bearing part: the chunker looks for exactly these
 * words to decide which section a chunk belongs to, so this table and the
 * chunker's patterns are two halves of one contract.
 */
interface TemplateVocabulary {
  readonly summary: string;
  readonly experience: string;
  readonly education: string;
  readonly skills: string;
  readonly languages: string;
  readonly certifications: string;
  readonly contact: string;
  readonly present: string;
  readonly months: readonly string[];
  /**
   * The proficiency enum is stored in English. Rendering it lowercased put
   * "Español — native" on a Spanish CV, which reads as a bug to a human and
   * hides the word a Spanish question would search for.
   */
  readonly levels: Record<LanguageLevel, string>;
}

const VOCABULARY: Record<CvLanguage, TemplateVocabulary> = {
  en: {
    summary: 'Summary',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    languages: 'Languages',
    certifications: 'Certifications',
    contact: 'Contact',
    present: 'Present',
    months: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
    levels: {
      NATIVE: 'native',
      FLUENT: 'fluent',
      ADVANCED: 'advanced',
      INTERMEDIATE: 'intermediate',
      BASIC: 'basic',
    },
  },
  es: {
    summary: 'Perfil',
    experience: 'Experiencia',
    education: 'Educación',
    skills: 'Habilidades',
    languages: 'Idiomas',
    certifications: 'Certificaciones',
    contact: 'Contacto',
    present: 'Actualidad',
    months: [
      'ene',
      'feb',
      'mar',
      'abr',
      'may',
      'jun',
      'jul',
      'ago',
      'sep',
      'oct',
      'nov',
      'dic',
    ],
    levels: {
      NATIVE: 'nativo',
      FLUENT: 'fluido',
      ADVANCED: 'avanzado',
      INTERMEDIATE: 'intermedio',
      BASIC: 'básico',
    },
  },
};

export const vocabularyFor = (language: CvLanguage): TemplateVocabulary =>
  VOCABULARY[language];

/**
 * Every interpolated string goes through here. The content is model-written and
 * lands inside an HTML document that Chromium executes: an unescaped angle
 * bracket in a job title is a broken layout at best.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `2021-03` → `Mar 2021`, in the CV's language. */
export function formatMonth(yearMonth: string, language: CvLanguage): string {
  const [year, month] = yearMonth.split('-');
  const index = Number(month) - 1;
  const names = vocabularyFor(language).months;

  return index >= 0 && index < names.length
    ? `${names[index]} ${year}`
    : escapeHtml(yearMonth);
}

export function formatDateRange(
  startDate: string,
  endDate: string | null,
  language: CvLanguage,
): string {
  const end =
    endDate === null
      ? vocabularyFor(language).present
      : formatMonth(endDate, language);

  return `${formatMonth(startDate, language)} – ${end}`;
}

export const formatLanguageLevel = (
  level: LanguageLevel,
  language: CvLanguage,
): string => vocabularyFor(language).levels[level];
