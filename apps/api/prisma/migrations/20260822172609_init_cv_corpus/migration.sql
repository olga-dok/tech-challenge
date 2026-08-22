-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "CvSection" AS ENUM ('SUMMARY', 'EXPERIENCE', 'EDUCATION', 'SKILLS', 'LANGUAGES', 'CONTACT', 'OTHER');

-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('JUNIOR', 'MID', 'SENIOR');

-- CreateTable
CREATE TABLE "Candidate" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "yearsExperience" INTEGER NOT NULL,
    "seniority" "Seniority" NOT NULL,
    "roleFamily" TEXT NOT NULL,
    "languages" TEXT[],
    "skills" TEXT[],
    "profileJson" JSONB NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "portraitPath" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sourceChecksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ingestedAt" TIMESTAMP(3),

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvChunk" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "section" "CvSection" NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    -- The width is fixed here, not in configuration: raising
    -- EMBEDDING_DIMENSIONS is a migration, and ingestion asserts the embedder
    -- agrees with this column at startup rather than writing short vectors.
    "embedding" vector(384) NOT NULL,
    -- Hand-written: Prisma can declare the column but not the expression that
    -- fills it. Maintained by Postgres, so a chunk's lexical index can never
    -- drift from its content. `to_tsvector(regconfig, text)` is immutable,
    -- which is what makes it legal in a generated column.
    "contentSearch" tsvector GENERATED ALWAYS AS (to_tsvector('english', "content")) STORED,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CvChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_slug_key" ON "Candidate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_sourceChecksum_key" ON "Candidate"("sourceChecksum");

-- CreateIndex
CREATE INDEX "Candidate_roleFamily_idx" ON "Candidate"("roleFamily");

-- CreateIndex
CREATE INDEX "Candidate_seniority_idx" ON "Candidate"("seniority");

-- CreateIndex
CREATE INDEX "Candidate_fullName_idx" ON "Candidate" USING GIN ("fullName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "CvChunk_candidateId_idx" ON "CvChunk"("candidateId");

-- CreateIndex
CREATE INDEX "CvChunk_contentSearch_idx" ON "CvChunk" USING GIN ("contentSearch" tsvector_ops);

-- CreateIndex
CREATE UNIQUE INDEX "CvChunk_candidateId_ordinal_key" ON "CvChunk"("candidateId", "ordinal");

-- AddForeignKey
ALTER TABLE "CvChunk" ADD CONSTRAINT "CvChunk_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (hand-written: Prisma has no Hnsw index type)
--
-- Cosine distance to match the L2-normalised embeddings the embedder emits, so
-- the index and the `<=>` operator used at query time agree. m/ef_construction
-- are left at pgvector's defaults: at a few hundred chunks the build is
-- instantaneous and recall is effectively exact.
--
-- Prisma cannot see this index, so a future `migrate dev` will generate a DROP
-- for it. When that happens, delete the DROP and copy this statement forward.
CREATE INDEX "CvChunk_embedding_hnsw_idx" ON "CvChunk" USING hnsw ("embedding" vector_cosine_ops);
