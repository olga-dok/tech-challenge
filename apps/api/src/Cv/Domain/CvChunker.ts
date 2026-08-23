import type { CvLanguage, CvSection } from '@repo/contracts';
import type { CvChunk } from './CvChunk';
import type { ExtractedDocument } from './TextExtractor';

/**
 * The exact heading words the generator prints, per language, plus common
 * synonyms a real-world CV might use instead. This must stay in sync with
 * packages/cv-templates/src/templateText.ts VOCABULARY — Domain cannot import
 * that package (it is not @repo/contracts), so the two tables are kept in
 * sync by hand rather than by a shared import.
 */
const SECTION_HEADINGS: Record<
  CvLanguage,
  Partial<Record<CvSection, string[]>>
> = {
  en: {
    SUMMARY: ['Summary', 'Profile', 'Objective'],
    EXPERIENCE: ['Experience', 'Work Experience', 'Professional Experience'],
    EDUCATION: ['Education'],
    SKILLS: ['Skills', 'Technical Skills', 'Competencies'],
    LANGUAGES: ['Languages'],
    CONTACT: ['Contact'],
  },
  es: {
    SUMMARY: ['Perfil', 'Resumen', 'Objetivo'],
    EXPERIENCE: [
      'Experiencia',
      'Experiencia Laboral',
      'Experiencia Profesional',
    ],
    EDUCATION: ['Educación', 'Formación'],
    SKILLS: ['Habilidades', 'Competencias'],
    LANGUAGES: ['Idiomas'],
    CONTACT: ['Contacto'],
  },
};

const ENTRY_PER_CHUNK_SECTIONS: readonly CvSection[] = [
  'EXPERIENCE',
  'EDUCATION',
];

// Section order chunks are emitted in — mirrors reading order on the rendered CV.
const SECTION_ORDER: readonly CvSection[] = [
  'SUMMARY',
  'EXPERIENCE',
  'EDUCATION',
  'SKILLS',
  'LANGUAGES',
  'CONTACT',
  'OTHER',
];

const MIN_CHUNK_TOKENS = 40;
const MAX_CHUNK_TOKENS = 400;
// Sub-pieces are split to a slightly lower target so the identity-header
// prefix added afterwards never pushes a chunk back over MAX_CHUNK_TOKENS.
const SPLIT_TARGET_TOKENS = 380;

const normalise = (value: string): string =>
  value
    .trim()
    .replace(/:$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const matchHeading = (line: string, language: CvLanguage): CvSection | null => {
  const normalised = normalise(line);
  if (!normalised) {
    return null;
  }

  const table = SECTION_HEADINGS[language];
  for (const section of Object.keys(table) as CvSection[]) {
    const synonyms = table[section] ?? [];
    if (synonyms.some((synonym) => normalise(synonym) === normalised)) {
      return section;
    }
  }

  return null;
};

const estimateTokens = (text: string): number => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length === 0 ? 0 : Math.ceil((words.length * 4) / 3);
};

const splitParagraphs = (text: string): string[] =>
  text
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

const splitBySentenceCap = (text: string, capTokens: number): string[] => {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const pieces: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    if (current.length > 0 && currentTokens + sentenceTokens > capTokens) {
      pieces.push(current.join(' '));
      current = [];
      currentTokens = 0;
    }
    current.push(sentence);
    currentTokens += sentenceTokens;
  }

  if (current.length > 0) {
    pieces.push(current.join(' '));
  }

  return pieces.length > 0 ? pieces : [text];
};

interface Piece {
  readonly section: CvSection;
  readonly body: string;
  /**
   * Identifies which original entry/section a piece came from. Merging only
   * joins pieces that share a groupId — otherwise two short-but-complete
   * experience entries would collapse into one chunk, defeating "one entry
   * per chunk". A shared groupId means the pieces are fragments of the same
   * entry produced by the over-cap sentence split, which is exactly what the
   * merge step exists to clean up.
   */
  readonly groupId: number;
}

const bucketBySection = (
  extracted: ExtractedDocument,
  language: CvLanguage,
): Piece[] => {
  const lines = extracted.rawText.split('\n');
  const hasAnyHeading = lines.some(
    (line) => matchHeading(line, language) !== null,
  );

  if (!hasAnyHeading) {
    return splitParagraphs(extracted.rawText).map((body, groupId) => ({
      section: 'OTHER',
      body,
      groupId,
    }));
  }

  const sectionLines = new Map<CvSection, string[]>();
  let current: CvSection = 'SUMMARY';

  for (const line of lines) {
    const matched = matchHeading(line, language);
    if (matched) {
      current = matched;
      continue;
    }
    const existing = sectionLines.get(current) ?? [];
    existing.push(line);
    sectionLines.set(current, existing);
  }

  const pieces: Piece[] = [];
  for (const section of SECTION_ORDER) {
    const rawLines = sectionLines.get(section);
    if (!rawLines) {
      continue;
    }
    const text = rawLines.join('\n').trim();
    if (!text) {
      continue;
    }

    if (ENTRY_PER_CHUNK_SECTIONS.includes(section)) {
      for (const entry of splitParagraphs(text)) {
        pieces.push({ section, body: entry, groupId: pieces.length });
      }
    } else {
      pieces.push({ section, body: text, groupId: pieces.length });
    }
  }

  return pieces;
};

const expandOversizePieces = (pieces: Piece[]): Piece[] =>
  pieces.flatMap((piece) =>
    estimateTokens(piece.body) > MAX_CHUNK_TOKENS
      ? splitBySentenceCap(piece.body, SPLIT_TARGET_TOKENS).map((body) => ({
          section: piece.section,
          body,
          groupId: piece.groupId,
        }))
      : [piece],
  );

// Merges any chunk under MIN_CHUNK_TOKENS into an adjacent same-groupId chunk
// (a sliver the over-cap split left behind), preferring the next one so a
// short opening fragment joins what follows it. Restricted to the same
// groupId, not just the same section, so two separate short experience
// entries never collapse into one chunk — that would defeat "one entry per
// chunk" for the common case of a brief job description.
const mergeSmallPieces = (pieces: Piece[]): Piece[] => {
  const result = [...pieces];
  let index = 0;

  while (index < result.length) {
    if (estimateTokens(result[index].body) >= MIN_CHUNK_TOKENS) {
      index += 1;
      continue;
    }

    const next = result[index + 1];
    const previous = result[index - 1];

    if (next && next.groupId === result[index].groupId) {
      result[index + 1] = {
        section: next.section,
        body: `${result[index].body}\n${next.body}`,
        groupId: next.groupId,
      };
      result.splice(index, 1);
      continue;
    }

    if (previous && previous.groupId === result[index].groupId) {
      result[index - 1] = {
        section: previous.section,
        body: `${previous.body}\n${result[index].body}`,
        groupId: previous.groupId,
      };
      result.splice(index, 1);
      index -= 1;
      continue;
    }

    index += 1;
  }

  return result;
};

const firstLine = (text: string): string => text.split('\n')[0].trim();

/**
 * Section-aware, not fixed-window: a citation should point at one job or one
 * degree, not an arbitrary slice of the document. Every chunk is prefixed
 * with the candidate's name and section so a retrieved snippet reads well
 * standalone in the chat, without the reader needing the candidate card too.
 */
export const chunkCv = (
  fullName: string,
  language: CvLanguage,
  extracted: ExtractedDocument,
): CvChunk[] => {
  const pieces = mergeSmallPieces(
    expandOversizePieces(bucketBySection(extracted, language)),
  );

  return pieces.map((piece, index) => {
    const detail = ENTRY_PER_CHUNK_SECTIONS.includes(piece.section)
      ? firstLine(piece.body)
      : null;
    const header = detail
      ? `${fullName} — ${piece.section} — ${detail}`
      : `${fullName} — ${piece.section}`;
    const content = `${header}\n${piece.body}`;

    return {
      section: piece.section,
      ordinal: index,
      content,
      tokenCount: estimateTokens(content),
    };
  });
};
