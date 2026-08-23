import type { CvSection } from '@repo/contracts';
import type { Embedder } from '../../Cv/Domain/Embedder';
import { Slug } from '../../Cv/Domain/Slug';
import type { Logger } from '../../Shared/Domain';
import type { PrismaConnection } from '../../Shared/Infrastructure/Prisma';
import type { Citation } from '../Domain/Citation';
import type { CvRetriever } from '../Domain/CvRetriever';
import type { Question } from '../Domain/Question';
import type { RankedCandidate } from '../Domain/RankedCandidate';
import { reciprocalRankFusion } from '../Domain/ReciprocalRankFusion';
import type { RetrievalResult } from '../Domain/RetrievalResult';
import type { RetrievedChunk } from '../Domain/RetrievedChunk';

const ARM_LIMIT = 30;
// Only the dense arm needs a floor: cosine distance always returns *some*
// top-30, however unrelated, where the lexical and name arms' WHERE clauses
// are naturally empty when nothing genuinely matches.
const DENSE_SIMILARITY_FLOOR = 0.15;
const NAME_MATCH_THRESHOLD = 0.3;
// Confident enough to say "the question names this person", not just that
// their name resembles some word in it.
const NAMED_QUERY_THRESHOLD = 0.5;
const MAX_CHUNKS_PER_CANDIDATE = 3;
const MAX_CITATIONS = 12;
const RRF_K = 60;

interface ArmRow {
  id: string;
  candidateId: string;
  candidateName: string;
  slug: string;
  section: CvSection;
  ordinal: number;
  content: string;
  score: number;
}

/**
 * Three independent SQL strategies, fused rather than chosen between: dense
 * embeddings miss exact tokens ("UPC"), lexical search misses paraphrases,
 * and neither reliably survives a misspelled name — so a demo question fails
 * only if all three do.
 */
export class HybridCvRetriever implements CvRetriever {
  private readonly logger?: Logger;

  constructor(
    private readonly embedder: Embedder,
    private readonly prisma: PrismaConnection,
    logger?: Logger,
  ) {
    this.logger = logger?.forContext('HybridCvRetriever');
  }

  async retrieve(question: Question): Promise<RetrievalResult> {
    const vector = await this.embedder.embedQuery(question.text);

    const [dense, lexical, name] = await Promise.all([
      this.denseArm(vector),
      this.lexicalArm(question.text),
      this.nameArm(question.text),
    ]);

    this.logger?.debug('Retrieval arm hits', {
      dense: dense.length,
      lexical: lexical.length,
      name: name.length,
    });

    const named =
      name[0] && name[0].score > NAMED_QUERY_THRESHOLD ? name[0] : null;
    const namedChunks = named
      ? await this.fullChunkSetFor(named.candidateId, named.score)
      : [];

    const pool = new Map<string, RetrievedChunk>();
    for (const chunk of [...dense, ...lexical, ...name]) {
      pool.set(chunk.id, chunk);
    }

    const fused = reciprocalRankFusion(
      [dense, lexical, name].map((arm) => arm.map((chunk) => chunk.id)),
      RRF_K,
    );

    const fusedChunks = [...pool.values()]
      .map((chunk) => ({ ...chunk, score: fused.get(chunk.id) ?? 0 }))
      .sort((a, b) => b.score - a.score);

    const citations = this.diversify(namedChunks, fusedChunks);

    return { citations, ranking: this.rankCandidates(citations) };
  }

  /**
   * The named candidate's full chunk set always leads, unbounded — their
   * relevant chunk (an Education row, say) may never have surfaced in any
   * arm's top 30. Everyone else is capped so one strong match doesn't crowd
   * out the rest of a genuinely broad question.
   */
  private diversify(
    namedChunks: readonly RetrievedChunk[],
    fusedChunks: readonly RetrievedChunk[],
  ): Citation[] {
    const citations: Citation[] = namedChunks.map((chunk) =>
      this.toCitation(chunk),
    );
    const namedCandidateId = namedChunks[0]?.candidateId;
    const countByCandidate = new Map<string, number>();

    for (const chunk of fusedChunks) {
      if (citations.length >= MAX_CITATIONS) {
        break;
      }
      if (chunk.candidateId === namedCandidateId) {
        continue;
      }

      const count = countByCandidate.get(chunk.candidateId) ?? 0;
      if (count >= MAX_CHUNKS_PER_CANDIDATE) {
        continue;
      }

      countByCandidate.set(chunk.candidateId, count + 1);
      citations.push(this.toCitation(chunk));
    }

    return citations.slice(0, MAX_CITATIONS);
  }

  private toCitation(chunk: RetrievedChunk): Citation {
    return {
      candidateId: chunk.candidateId,
      candidateName: chunk.candidateName,
      slug: chunk.slug,
      section: chunk.section,
      ordinal: chunk.ordinal,
      snippet: chunk.content,
      score: chunk.score,
    };
  }

  private rankCandidates(citations: readonly Citation[]): RankedCandidate[] {
    const bestByCandidate = new Map<string, Citation>();

    for (const citation of citations) {
      const best = bestByCandidate.get(citation.candidateId);
      if (!best || citation.score > best.score) {
        bestByCandidate.set(citation.candidateId, citation);
      }
    }

    return [...bestByCandidate.values()]
      .sort((a, b) => b.score - a.score)
      .map((citation, index) => ({
        slug: citation.slug,
        rank: index + 1,
        score: citation.score,
        reason: `Strongest match in ${sectionLabel(citation.section)}`,
      }));
  }

  private async denseArm(vector: readonly number[]): Promise<RetrievedChunk[]> {
    const literal = `[${vector.join(',')}]`;
    const rows = await this.prisma.$queryRaw<ArmRow[]>`
      SELECT ch.id, ch."candidateId", c."fullName" AS "candidateName", c.slug,
             ch.section, ch.ordinal, ch.content,
             1 - (ch.embedding <=> ${literal}::vector) AS score
      FROM "CvChunk" ch
      JOIN "Candidate" c ON c.id = ch."candidateId"
      WHERE 1 - (ch.embedding <=> ${literal}::vector) >= ${DENSE_SIMILARITY_FLOOR}
      ORDER BY ch.embedding <=> ${literal}::vector ASC
      LIMIT ${ARM_LIMIT}
    `;

    return rows.map((row) => this.toRetrievedChunk(row));
  }

  private async lexicalArm(text: string): Promise<RetrievedChunk[]> {
    const rows = await this.prisma.$queryRaw<ArmRow[]>`
      SELECT ch.id, ch."candidateId", c."fullName" AS "candidateName", c.slug,
             ch.section, ch.ordinal, ch.content,
             ts_rank(ch."contentSearch", websearch_to_tsquery('english', ${text})) AS score
      FROM "CvChunk" ch
      JOIN "Candidate" c ON c.id = ch."candidateId"
      WHERE ch."contentSearch" @@ websearch_to_tsquery('english', ${text})
      ORDER BY score DESC
      LIMIT ${ARM_LIMIT}
    `;

    return rows.map((row) => this.toRetrievedChunk(row));
  }

  /**
   * `word_similarity`, not `similarity`: `similarity` compares two whole
   * strings' trigram sets, so a full question sentence would swamp a short
   * name. `word_similarity` finds the best-matching substring of the longer
   * text instead — exactly "does this name appear somewhere in this
   * question."
   */
  private async nameArm(text: string): Promise<RetrievedChunk[]> {
    const rows = await this.prisma.$queryRaw<ArmRow[]>`
      SELECT ch.id, ch."candidateId", c."fullName" AS "candidateName", c.slug,
             ch.section, ch.ordinal, ch.content,
             word_similarity(c."fullName", ${text}) AS score
      FROM "CvChunk" ch
      JOIN "Candidate" c ON c.id = ch."candidateId"
      WHERE word_similarity(c."fullName", ${text}) > ${NAME_MATCH_THRESHOLD}
      ORDER BY score DESC
      LIMIT ${ARM_LIMIT}
    `;

    return rows.map((row) => this.toRetrievedChunk(row));
  }

  private async fullChunkSetFor(
    candidateId: string,
    score: number,
  ): Promise<RetrievedChunk[]> {
    const rows = await this.prisma.$queryRaw<Omit<ArmRow, 'score'>[]>`
      SELECT ch.id, ch."candidateId", c."fullName" AS "candidateName", c.slug,
             ch.section, ch.ordinal, ch.content
      FROM "CvChunk" ch
      JOIN "Candidate" c ON c.id = ch."candidateId"
      WHERE ch."candidateId" = ${candidateId}::uuid
      ORDER BY ch.ordinal ASC
    `;

    return rows.map((row) => this.toRetrievedChunk({ ...row, score }));
  }

  private toRetrievedChunk(row: ArmRow): RetrievedChunk {
    return {
      id: row.id,
      candidateId: row.candidateId,
      candidateName: row.candidateName,
      slug: Slug.from(row.slug),
      section: row.section,
      ordinal: row.ordinal,
      content: row.content,
      score: row.score,
    };
  }
}

const SECTION_LABELS: Record<CvSection, string> = {
  SUMMARY: 'Summary',
  EXPERIENCE: 'Experience',
  EDUCATION: 'Education',
  SKILLS: 'Skills',
  LANGUAGES: 'Languages',
  CONTACT: 'Contact',
  OTHER: 'the profile',
};

const sectionLabel = (section: CvSection): string => SECTION_LABELS[section];
