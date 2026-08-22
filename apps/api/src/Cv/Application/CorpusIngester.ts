import type { GenerationStreamEvent } from '@repo/contracts';
import type { Observable } from 'rxjs';

/**
 * Indexing a generated corpus, as the generation stream sees it.
 *
 * Generation chains straight into ingestion so one button leaves the corpus
 * queryable — no second click, no "now run the indexer" step in a demo. The
 * ingester emits into the same event union, so the frontend needs no new
 * contract to show its progress.
 *
 * Injected as an optional dependency: until the ingestion pipeline exists the
 * use case simply reports zero chunks, and the stream shape does not change when
 * it arrives.
 */
export interface CorpusIngester {
  ingest(): Observable<GenerationStreamEvent>;
}

export const CorpusIngesterId = Symbol('CorpusIngester');
