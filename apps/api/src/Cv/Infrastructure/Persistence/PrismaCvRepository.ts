import type { Prisma } from '@prisma/client';
import type {
  CandidateProfile,
  CvTemplateId,
  RoleFamily,
  Seniority,
} from '@repo/contracts';
import type { PrismaConnection } from '../../../Shared/Infrastructure/Prisma';
import { Candidate } from '../../Domain/Candidate';
import type { EmbeddedCvChunk } from '../../Domain/CvChunk';
import type {
  CandidatePageCriteria,
  CorpusStats,
  CvRepository,
} from '../../Domain/CvRepository';
import { Slug } from '../../Domain/Slug';

interface CandidateRow {
  id: string;
  slug: string;
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  country: string;
  yearsExperience: number;
  seniority: Seniority;
  roleFamily: string;
  languages: string[];
  skills: string[];
  profileJson: Prisma.JsonValue;
  pdfPath: string;
  portraitPath: string;
  templateId: string;
  sourceChecksum: string;
  createdAt: Date;
  ingestedAt: Date | null;
  contentHash: string | null;
}

export class PrismaCvRepository implements CvRepository {
  constructor(private readonly prisma: PrismaConnection) {}

  async findChecksums(): Promise<Set<string>> {
    const rows = await this.prisma.candidate.findMany({
      select: { sourceChecksum: true },
    });

    return new Set(rows.map((row) => row.sourceChecksum));
  }

  async findBySlug(slug: Slug): Promise<Candidate | null> {
    const row = await this.prisma.candidate.findUnique({
      where: { slug: slug.value },
    });

    return row === null ? null : this.buildCandidate(row);
  }

  async findByChecksum(checksum: string): Promise<Candidate | null> {
    const row = await this.prisma.candidate.findUnique({
      where: { sourceChecksum: checksum },
    });

    return row === null ? null : this.buildCandidate(row);
  }

  async save(candidate: Candidate): Promise<Candidate> {
    const profile = candidate.profile;
    const writable = {
      fullName: candidate.fullName,
      headline: candidate.headline,
      email: profile.contact.email,
      phone: profile.contact.phone,
      location: profile.contact.location,
      country: candidate.persona.country,
      yearsExperience: candidate.persona.yearsExperience,
      seniority: candidate.persona.seniority,
      roleFamily: candidate.persona.roleFamily,
      languages: candidate.languages(),
      skills: profile.skills,
      // Written verbatim rather than mapped field by field: this column is the
      // ground truth the evaluation harness reads back, so reshaping it here
      // would make the two disagree about what the corpus contains.
      profileJson: profile as unknown as Prisma.InputJsonValue,
      pdfPath: candidate.files.pdfPath,
      portraitPath: candidate.files.portraitPath,
      templateId: candidate.templateId,
      sourceChecksum: candidate.sourceChecksum,
    };

    // Upsert by slug, so regenerating a candidate replaces them instead of
    // colliding on the unique index.
    const row = await this.prisma.candidate.upsert({
      where: { slug: candidate.slug.value },
      create: { slug: candidate.slug.value, ...writable },
      update: writable,
    });

    return this.buildCandidate(row);
  }

  countAll(): Promise<number> {
    return this.prisma.candidate.count();
  }

  async findAll(): Promise<Candidate[]> {
    const rows = await this.prisma.candidate.findMany();

    return rows.map((row) => this.buildCandidate(row));
  }

  /**
   * Delete-then-insert plus the contentHash/ingestedAt stamp, all in one
   * transaction: a partial embedding failure must never leave a candidate
   * half-indexed, so the old chunks are only gone once the new ones (and the
   * stamp) have committed alongside them.
   *
   * The insert is raw SQL because `embedding` is declared `Unsupported("vector")`
   * in schema.prisma — the typed client has no column to write it through, so
   * the vector literal and its `::vector` cast are hand-written here, the one
   * place the ORM leaks.
   */
  async replaceChunks(
    candidateId: string,
    contentHash: string,
    chunks: readonly EmbeddedCvChunk[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.cvChunk.deleteMany({ where: { candidateId } }),
      ...chunks.map(
        (chunk) => this.prisma.$executeRaw`
          INSERT INTO "CvChunk" (id, "candidateId", section, ordinal, content, "tokenCount", embedding)
          VALUES (
            gen_random_uuid(),
            ${candidateId}::uuid,
            ${chunk.section}::"CvSection",
            ${chunk.ordinal},
            ${chunk.content},
            ${chunk.tokenCount},
            ${`[${chunk.embedding.join(',')}]`}::vector
          )
        `,
      ),
      this.prisma.candidate.update({
        where: { id: candidateId },
        data: { contentHash, ingestedAt: new Date() },
      }),
    ]);
  }

  async findPage(
    criteria: CandidatePageCriteria,
  ): Promise<{ items: Candidate[]; total: number }> {
    const where: Prisma.CandidateWhereInput = {
      ...(criteria.roleFamily !== undefined && {
        roleFamily: criteria.roleFamily,
      }),
      ...(criteria.seniority !== undefined && {
        seniority: criteria.seniority,
      }),
      ...(criteria.skill !== undefined && { skills: { has: criteria.skill } }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.candidate.findMany({
        where,
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.candidate.count({ where }),
    ]);

    return { items: rows.map((row) => this.buildCandidate(row)), total };
  }

  async findBySlugs(slugs: readonly Slug[]): Promise<Candidate[]> {
    const rows = await this.prisma.candidate.findMany({
      where: { slug: { in: slugs.map((slug) => slug.value) } },
    });

    return rows.map((row) => this.buildCandidate(row));
  }

  async corpusStats(): Promise<CorpusStats> {
    const [candidates, chunks, aggregate] = await Promise.all([
      this.prisma.candidate.count(),
      this.prisma.cvChunk.count(),
      this.prisma.candidate.aggregate({ _max: { ingestedAt: true } }),
    ]);

    return { candidates, chunks, lastIngestedAt: aggregate._max.ingestedAt };
  }

  /**
   * Rows in, domain objects out — a Prisma model never crosses this boundary.
   *
   * `profileJson` is trusted rather than re-validated: it was zod-validated
   * before it was written, and re-parsing on every read would turn listing a
   * page of candidates into a dozen schema validations.
   */
  private buildCandidate(row: CandidateRow): Candidate {
    return Candidate.fromAttributes({
      id: row.id,
      slug: Slug.from(row.slug),
      profile: row.profileJson as unknown as CandidateProfile,
      persona: {
        country: row.country,
        roleFamily: row.roleFamily as RoleFamily,
        seniority: row.seniority,
        yearsExperience: row.yearsExperience,
      },
      files: { pdfPath: row.pdfPath, portraitPath: row.portraitPath },
      templateId: row.templateId as CvTemplateId,
      sourceChecksum: row.sourceChecksum,
      createdAt: row.createdAt,
      ingestedAt: row.ingestedAt,
      contentHash: row.contentHash,
    });
  }
}
