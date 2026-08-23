import type { ExtractedDocument } from '../../../../src/Cv/Domain/TextExtractor';
import { chunkCv, detectCvLanguage } from '../../../../src/Cv/Domain/CvChunker';

const documentOf = (rawText: string): ExtractedDocument => ({
  pages: [rawText],
  rawText,
});

describe('chunkCv', () => {
  it('attributes chunks to sections detected from English headers, one chunk per experience entry', () => {
    const rawText = `Ana Ruiz
Senior Backend Engineer

Summary
Fintech backend engineer with 11 years building resilient payment systems across Europe.

Experience
Senior Backend Engineer, Nimbus
Mar 2021 - Present
Barcelona, Spain
Led migration to event-driven architecture.
Mentored three junior engineers.

Backend Engineer, Solaris
Jan 2018 - Feb 2021
Madrid, Spain
Built the core ledger service.

Education
B.Sc. Computer Science, UPC
Barcelona, Spain - 2017

Skills
TypeScript, Node.js, PostgreSQL, Kafka

Languages
English (fluent), Spanish (native)`;

    const chunks = chunkCv('Ana Ruiz', 'en', documentOf(rawText));

    const bySection = (section: string): typeof chunks =>
      chunks.filter((chunk) => chunk.section === section);

    expect(bySection('SUMMARY')).toHaveLength(1);
    expect(bySection('EXPERIENCE')).toHaveLength(2);
    expect(bySection('EDUCATION')).toHaveLength(1);
    expect(bySection('SKILLS')).toHaveLength(1);
    expect(bySection('LANGUAGES')).toHaveLength(1);

    const [firstJob, secondJob] = bySection('EXPERIENCE');
    expect(firstJob.content).toContain('Senior Backend Engineer, Nimbus');
    expect(secondJob.content).toContain('Backend Engineer, Solaris');

    for (const chunk of chunks) {
      expect(chunk.content.startsWith('Ana Ruiz — ')).toBe(true);
    }
  });

  it('attributes chunks to sections detected from Spanish headers', () => {
    const rawText = `Ana Ruiz
Ingeniera Backend Senior

Perfil
Ingeniera backend fintech con 11 anos de experiencia en sistemas de pago resilientes.

Experiencia
Ingeniera Backend Senior, Nimbus
Mar 2021 - Actualidad
Barcelona, Espana
Lidero la migracion a una arquitectura orientada a eventos.

Educacion
Grado en Informatica, UPC
Barcelona, Espana - 2017

Habilidades
TypeScript, Node.js, PostgreSQL, Kafka

Idiomas
Espanol (nativo), Ingles (fluido)`;

    const chunks = chunkCv('Ana Ruiz', 'es', documentOf(rawText));

    const sections = new Set(chunks.map((chunk) => chunk.section));
    expect(sections.has('SUMMARY')).toBe(true);
    expect(sections.has('EXPERIENCE')).toBe(true);
    expect(sections.has('EDUCATION')).toBe(true);
    expect(sections.has('SKILLS')).toBe(true);
    expect(sections.has('LANGUAGES')).toBe(true);
  });

  it('degrades to paragraph chunking under OTHER when no header is recognized', () => {
    const rawText = `This is a CV with no recognizable section headers at all.

It just has a couple of paragraphs of free text describing the candidate.

A third paragraph, for good measure, describing more things about them.`;

    expect(() =>
      chunkCv('Jordan Lee', 'en', documentOf(rawText)),
    ).not.toThrow();

    const chunks = chunkCv('Jordan Lee', 'en', documentOf(rawText));

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.section).toBe('OTHER');
      expect(chunk.content.startsWith('Jordan Lee — ')).toBe(true);
    }
  });

  it('splits an over-cap entry on sentence boundaries and merges any resulting sliver', () => {
    const sentence =
      'This sentence describes a distinct accomplishment in enough detail to matter.';
    const longParagraph = Array.from({ length: 60 }, () => sentence).join(' ');
    const rawText = `Priya Nair
Principal Engineer

Summary
${longParagraph}

Experience
Principal Engineer, Vertex
Jan 2019 - Present
Remote
Owned the platform migration end to end.`;

    const chunks = chunkCv('Priya Nair', 'en', documentOf(rawText));
    const summaryChunks = chunks.filter((chunk) => chunk.section === 'SUMMARY');

    expect(summaryChunks.length).toBeGreaterThan(1);
    for (const chunk of summaryChunks) {
      expect(chunk.tokenCount).toBeLessThanOrEqual(400);
    }
  });
});

describe('detectCvLanguage', () => {
  it('picks English when English headings match', () => {
    const rawText = 'Ana Ruiz\n\nSummary\nSome text.\n\nExperience\nA job.';

    expect(detectCvLanguage(rawText)).toBe('en');
  });

  it('picks Spanish when Spanish headings match', () => {
    const rawText =
      'Ana Ruiz\n\nPerfil\nAlgo de texto.\n\nExperiencia\nUn trabajo.';

    expect(detectCvLanguage(rawText)).toBe('es');
  });

  it('defaults to English when no heading is recognized', () => {
    const rawText = 'Just some paragraphs with no headings at all in them.';

    expect(detectCvLanguage(rawText)).toBe('en');
  });
});
