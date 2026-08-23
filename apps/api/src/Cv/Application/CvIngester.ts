import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { Logger } from '../../Shared/Domain';
import type { Candidate } from '../Domain/Candidate';
import type { CvChunk, EmbeddedCvChunk } from '../Domain/CvChunk';
import { chunkCv, detectCvLanguage } from '../Domain/CvChunker';
import type { CvRepository } from '../Domain/CvRepository';
import type { Embedder } from '../Domain/Embedder';
import { EmbeddingFailedError } from '../Domain/EmbeddingFailedError';
import type { TextExtractor } from '../Domain/TextExtractor';

// A plain slice loop, not a paced batch: the local embedder has no quota to
// respect, so the only reason to batch at all is bounding one call's request
// size. Not extracted alongside `corpusBatching.ts` — that helper's pacing and
// backoff are generation-specific and this ingester has neither.
const EMBEDDING_BATCH_SIZE = 16;

export interface IngestOutcome {
  readonly status: 'ingested' | 'skipped' | 'failed';
  readonly chunks: number;
  readonly reason?: string;
}

/**
 * The per-candidate engine: extract → chunk → embed → persist. Kept separate
 * from `IngestCvCorpusUseCase` so the orchestration (fan-out, progress events)
 * and the per-PDF work stay independently testable, matching the same split
 * `GenerateCvCorpusUseCase` uses for generation.
 */
export class CvIngester {
  private readonly logger?: Logger;

  constructor(
    private readonly extractor: TextExtractor,
    private readonly embedder: Embedder,
    private readonly repository: CvRepository,
    private readonly storageDir: string,
    expectedDimensions: number,
    logger?: Logger,
  ) {
    this.logger = logger?.forContext('CvIngester');

    // Checked once here rather than trusting the per-call guard inside the
    // embedder: a misconfigured embedder should fail application bootstrap,
    // not the first chunk of the first candidate.
    if (embedder.dimensions !== expectedDimensions) {
      throw EmbeddingFailedError.forDimensionMismatch(
        'configured embedder',
        expectedDimensions,
        embedder.dimensions,
      );
    }
  }

  async ingestOne(
    candidate: Candidate,
    force: boolean,
  ): Promise<IngestOutcome> {
    const pdfPath = join(this.storageDir, candidate.files.pdfPath);
    const extraction = await this.extractor.extract(pdfPath);

    if (!extraction.succeeded) {
      this.logger?.warn('Extraction failed, skipping candidate', {
        candidate: candidate.fullName,
        reason: extraction.failure.reason,
        detail: extraction.failure.detail,
      });

      return {
        status: 'failed',
        chunks: 0,
        reason: extraction.failure.detail,
      };
    }

    const contentHash = sha256(extraction.document.rawText);

    if (!force && candidate.contentHash === contentHash) {
      this.logger?.info('Content unchanged, skipping re-embedding', {
        candidate: candidate.fullName,
      });

      return { status: 'skipped', chunks: 0 };
    }

    const language = detectCvLanguage(extraction.document.rawText);
    const chunks = chunkCv(candidate.fullName, language, extraction.document);
    const embedded = await this.embedChunks(chunks);

    // Non-null: every candidate reaching ingestion came from `repository
    // .findAll()`, which only returns already-persisted rows.
    await this.repository.replaceChunks(
      candidate.id as string,
      contentHash,
      embedded,
    );

    return { status: 'ingested', chunks: embedded.length };
  }

  private async embedChunks(
    chunks: readonly CvChunk[],
  ): Promise<EmbeddedCvChunk[]> {
    const embedded: EmbeddedCvChunk[] = [];

    for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);
      const vectors = await this.embedder.embed(
        batch.map((chunk) => chunk.content),
      );

      batch.forEach((chunk, index) => {
        embedded.push({ ...chunk, embedding: vectors[index] });
      });
    }

    return embedded;
  }
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
