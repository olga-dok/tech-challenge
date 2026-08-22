import { z } from 'zod';

/**
 * Kept identical to the domain `Slug` value object's pattern. Slugs address
 * candidates in URLs and drive file lookups, so a loose pattern here is a path
 * traversal there.
 */
export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be a lowercase kebab-case slug');
export type Slug = z.infer<typeof SlugSchema>;

/**
 * Relevance, for display and ordering only. Deliberately not capped at 1: the
 * retrieval arms are on different scales (cosine similarity, `ts_rank`, fused
 * RRF weights) and a contract that rejects a legitimate score would take the
 * whole answer down with it.
 */
export const ScoreSchema = z.number().min(0);
