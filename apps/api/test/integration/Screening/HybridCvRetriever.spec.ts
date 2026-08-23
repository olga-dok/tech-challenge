import { sampleProfile } from '@repo/cv-templates';
import { Candidate } from '../../../src/Cv/Domain/Candidate';
import type { EmbeddedCvChunk } from '../../../src/Cv/Domain/CvChunk';
import type { Embedder } from '../../../src/Cv/Domain/Embedder';
import { PrismaCvRepository } from '../../../src/Cv/Infrastructure/Persistence/PrismaCvRepository';
import { Slug } from '../../../src/Cv/Domain/Slug';
import { Question } from '../../../src/Screening/Domain/Question';
import { HybridCvRetriever } from '../../../src/Screening/Infrastructure/HybridCvRetriever';
import { PrismaConnection } from '../../../src/Shared/Infrastructure/Prisma';
import {
  loadAppConfig,
  type AppConfig,
} from '../../../src/Shared/Infrastructure/Config';

/**
 * The real `LocalEmbedder` cannot run inside Jest here: transformers.js's
 * onnxruntime-node binding does its own `instanceof Float32Array` check
 * internally, and Jest's default `testEnvironment: 'node'` gives every test
 * file its own VM context with its own `Float32Array` constructor — the
 * exact same cross-realm mismatch as Node's fs errors failing `instanceof
 * Error` inside Jest (see PdfParseTextExtractor's `--experimental-vm-modules`
 * fix), except this one is inside a native binding this codebase does not
 * own, so there is no equivalent duck-typing fix available.
 *
 * A hashed bag-of-words embedding stands in instead: it is deterministic and
 * makes cosine similarity track shared vocabulary, which is exactly what
 * these fixtures are designed to be told apart by ("Kubernetes" vs
 * "Figma", "UPC" vs nothing). What is under test here is the SQL arms, RRF,
 * and diversification — not embedding quality, which the real model already
 * proved out end to end in the Step 10 manual verification run.
 */
const fakeEmbedder = (dimensions: number): Embedder => {
  const hash = (value: string): number => {
    let acc = 0;
    for (let index = 0; index < value.length; index += 1) {
      acc = (acc * 31 + value.charCodeAt(index)) | 0;
    }
    return Math.abs(acc);
  };

  const embedOne = (text: string): number[] => {
    const vector = new Array<number>(dimensions).fill(0);
    const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    for (const word of words) {
      vector[hash(word) % dimensions] += 1;
    }
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map((v) => v / norm);
  };

  return {
    dimensions,
    embed: (texts) => Promise.resolve(texts.map((text) => embedOne(text))),
    embedQuery: (text) => Promise.resolve(embedOne(text)),
  };
};

/**
 * Against a real Postgres, because what is worth checking here is whether the
 * three SQL arms (vector distance, `websearch_to_tsquery`, `word_similarity`)
 * and RRF fusion actually surface the right chunks — a mocked query could
 * never prove that either way.
 *
 * Not part of `pnpm test` — see `pnpm --filter api test:integration`.
 */
describe('HybridCvRetriever', () => {
  let config: AppConfig;
  let prisma: PrismaConnection;
  let repository: PrismaCvRepository;
  let embedder: Embedder;
  let retriever: HybridCvRetriever;

  interface RawChunk {
    section: EmbeddedCvChunk['section'];
    ordinal: number;
    content: string;
  }

  const candidateFor = (slug: string, fullName: string): Candidate =>
    Candidate.fromAttributes({
      id: null,
      slug: Slug.from(`it-${slug}`),
      profile: { ...sampleProfile(), fullName },
      persona: {
        country: 'Spain',
        roleFamily: 'BACKEND',
        seniority: 'SENIOR',
        yearsExperience: 8,
      },
      files: {
        pdfPath: `cvs/${slug}.pdf`,
        portraitPath: `portraits/${slug}.jpg`,
      },
      templateId: 'classic',
      sourceChecksum: `checksum-it-${slug}`,
      createdAt: null,
      ingestedAt: null,
      contentHash: null,
    });

  const seedCandidate = async (
    slug: string,
    fullName: string,
    rawChunks: RawChunk[],
  ): Promise<void> => {
    const saved = await repository.save(candidateFor(slug, fullName));
    const vectors = await embedder.embed(
      rawChunks.map((chunk) => chunk.content),
    );
    const chunks: EmbeddedCvChunk[] = rawChunks.map((chunk, index) => ({
      section: chunk.section,
      ordinal: chunk.ordinal,
      content: chunk.content,
      tokenCount: chunk.content.split(/\s+/).length,
      embedding: vectors[index],
    }));

    // Non-null: just persisted.
    await repository.replaceChunks(saved.id as string, `hash-${slug}`, chunks);
  };

  beforeAll(async () => {
    config = loadAppConfig({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/cv_screener',
      GOOGLE_API_KEY: 'test-key',
      PORT: '3999',
    });
    prisma = new PrismaConnection(config);
    await prisma.onModuleInit();
    repository = new PrismaCvRepository(prisma);
    embedder = fakeEmbedder(config.embedding.dimensions);
    retriever = new HybridCvRetriever(embedder, prisma);

    await seedCandidate('ana-ruiz', 'Ana Ruiz', [
      {
        section: 'SUMMARY',
        ordinal: 0,
        content:
          'Ana Ruiz — SUMMARY\nSenior backend engineer specialising in container orchestration and cloud infrastructure.',
      },
      {
        section: 'EXPERIENCE',
        ordinal: 1,
        content:
          'Ana Ruiz — EXPERIENCE — Senior Backend Engineer, Nimbus\nDesigned and operated production Kubernetes clusters serving millions of requests per day. Led the migration from a monolith to containerised microservices.',
      },
      {
        section: 'SKILLS',
        ordinal: 2,
        content:
          'Ana Ruiz — SKILLS\nKubernetes, Docker, Go, PostgreSQL, Terraform.',
      },
    ]);

    await seedCandidate('ana-torres', 'Ana Torres', [
      {
        section: 'SUMMARY',
        ordinal: 0,
        content:
          'Ana Torres — SUMMARY\nProduct designer focused on accessible, research-driven interface design for financial products.',
      },
      {
        section: 'SKILLS',
        ordinal: 1,
        content:
          'Ana Torres — SKILLS\nFigma, User Research, Accessibility, Prototyping.',
      },
    ]);

    await seedCandidate('marc-soler', 'Marc Soler', [
      {
        section: 'SUMMARY',
        ordinal: 0,
        content:
          'Marc Soler — RESUMEN\nIngeniero de datos con experiencia en pipelines de analitica a gran escala.',
      },
      {
        section: 'EDUCATION',
        ordinal: 1,
        content:
          'Marc Soler — EDUCATION\nGrado en Ingeniería Informática, Universitat Politècnica de Catalunya (UPC)\nBarcelona, España - 2015',
      },
    ]);

    await seedCandidate('laura-prat', 'Laura Prat', [
      {
        section: 'SUMMARY',
        ordinal: 0,
        content:
          'Laura Prat — SUMMARY\nTechnical product manager bridging engineering and go-to-market strategy.',
      },
      {
        section: 'EXPERIENCE',
        ordinal: 1,
        content:
          'Laura Prat — EXPERIENCE — Technical Product Manager, Vertex\nWrote internal automation scripts in Python to analyse funnel drop-off and prioritised the roadmap around the findings.',
      },
      {
        section: 'SKILLS',
        ordinal: 2,
        content:
          'Laura Prat — SKILLS\nProduct Strategy, Roadmapping, Agile, SQL.',
      },
    ]);

    await seedCandidate('tomas-vidal', 'Tomás Vidal', [
      {
        section: 'SUMMARY',
        ordinal: 0,
        content:
          'Tomás Vidal — SUMMARY\nBrand designer working across print and digital identity systems for hospitality clients.',
      },
    ]);
  }, 60_000);

  afterAll(async () => {
    await prisma.candidate.deleteMany({
      where: { slug: { startsWith: 'it-' } },
    });
    await prisma.onModuleDestroy();
  });

  it('surfaces the right candidate for a skill query via the dense arm', async () => {
    const result = await retriever.retrieve(
      Question.from(
        'Who has hands-on experience running Kubernetes in production?',
      ),
    );

    expect(
      result.citations.some(
        (citation) => citation.candidateName === 'Ana Ruiz',
      ),
    ).toBe(true);
  });

  it('surfaces an exact-institution match via the lexical arm', async () => {
    const result = await retriever.retrieve(
      Question.from('Who studied at UPC?'),
    );

    expect(
      result.citations.some(
        (citation) =>
          citation.candidateName === 'Marc Soler' &&
          citation.section === 'EDUCATION',
      ),
    ).toBe(true);
    expect(
      result.ranking.every(
        (candidate) => candidate.slug.value === 'it-marc-soler',
      ),
    ).toBe(true);
  });

  it('resolves a named-person query to that specific candidate and loads their full chunk set', async () => {
    const result = await retriever.retrieve(
      Question.from("Summarize Ana Ruiz's profile"),
    );

    const anaRuizCitations = result.citations.filter(
      (citation) => citation.candidateName === 'Ana Ruiz',
    );
    expect(anaRuizCitations).toHaveLength(3);
    expect(result.ranking[0]?.slug.value).toBe('it-ana-ruiz');
  });

  it('surfaces the institution match for a Spanish-language question', async () => {
    const result = await retriever.retrieve(
      Question.from(
        '¿Quién estudió en la Universitat Politècnica de Catalunya?',
      ),
    );

    expect(
      result.citations.some(
        (citation) => citation.candidateName === 'Marc Soler',
      ),
    ).toBe(true);
  });

  it('returns little or nothing for a question with no answer in the corpus', async () => {
    const result = await retriever.retrieve(
      Question.from(
        'Who has 40 years of experience in deep sea welding and submarine repair?',
      ),
    );

    // The fake embedder's bag-of-words hashing gives generic shared words
    // (who/has/of/experience) a faint, non-zero similarity that a real
    // semantic model would not — so a couple of chunks can still clear the
    // dense floor. What must never happen is a *confident* match: every
    // surviving score should sit at "barely passed the floor once", not the
    // 0.03+ a chunk earns by ranking well in more than one arm (see the
    // other tests' passing matches).
    expect(result.citations.length).toBeLessThanOrEqual(3);
    expect(result.citations.every((citation) => citation.score < 0.02)).toBe(
      true,
    );
  });
});
