import { z } from 'zod';

export const CorpusStatsSchema = z.object({
  candidates: z.number().int().min(0),
  chunks: z.number().int().min(0),
  avgChunksPerCandidate: z.number().min(0),
  lastIngestedAt: z.iso.datetime().nullable(),
  /**
   * Drives the toolbar's one decision: "Generate corpus" or "Regenerate". True
   * only when there are candidates AND their chunks are indexed — a generated
   * but un-ingested corpus can be browsed and not asked about.
   */
  isIngested: z.boolean(),
});
export type CorpusStatsDto = z.infer<typeof CorpusStatsSchema>;

export const GenerateCorpusRequestSchema = z.object({
  /**
   * Capped at 40 because a free-tier key is the bottleneck, not the code.
   * The default lives here rather than in config so the wire contract is
   * self-describing for any client; `CORPUS_DEFAULT_SIZE` is the CLI's default,
   * where there is no request body to carry one.
   */
  size: z.number().int().min(1).max(40).default(25),
  /** Omitted means "use CORPUS_SEED", so a demo run is reproducible by default. */
  seed: z.number().int().min(0).optional(),
  /**
   * Off by default, which is what makes re-clicking Generate a resume rather
   * than a duplicate: existing candidates are skipped by checksum unless this
   * is set.
   */
  force: z.boolean().default(false),
});
export type GenerateCorpusRequestDto = z.infer<
  typeof GenerateCorpusRequestSchema
>;
