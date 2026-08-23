-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "contentHash" TEXT;

-- Prisma generated a DROP for this hand-written index (it declares the column
-- but not an Hnsw index type) — removed here per schema.prisma's own note, so
-- a fresh `migrate deploy` never loses cosine-neighbour search. Copied forward
-- verbatim from the init migration.
CREATE INDEX IF NOT EXISTS "CvChunk_embedding_hnsw_idx" ON "CvChunk" USING hnsw ("embedding" vector_cosine_ops);
