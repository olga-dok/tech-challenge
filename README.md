# AI-Powered CV Screener

**AI-powered candidate screening from synthetic CVs.** Generate realistic CVs, index them in PostgreSQL + pgvector, and ask natural-language screening questions that return grounded answers, citations, and ranked candidates synchronized with the gallery.

![Gallery filtered by a chat answer](docs/Screenshot.png)

## What it demonstrates

- **Synthetic CV generation** — structured candidate profiles, portraits, HTML templates and PDFs.
- **Semantic + lexical retrieval** — hybrid search over section-aware CV chunks.
- **Grounded screening answers** — answers are generated from retrieved CV evidence with citations.
- **Candidate ranking** — screening results automatically synchronize with the candidate gallery.
- **Streaming UX** — screening answers are streamed to the UI via SSE.
- **Type-safe monorepo** — shared Zod contracts between the NestJS API and Next.js frontend.

## Prerequisites

| Requirement | Version / Notes |
| --- | --- |
| Node.js | `22+` |
| pnpm | `11+` (repo is pinned to `pnpm@11.22.0`) |
| Docker | Required for local Postgres + `pgvector` |
| LLM API key | One free key: Google AI Studio (default) or OpenRouter |

## Quick start (clean clone)

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create local environment file:

   ```bash
   cp .env.example .env
   ```

3. Add one free LLM key in `.env`:
   - default path: set `GOOGLE_API_KEY` (keep `LLM_PROVIDER=gemini`)
   - alternative path: set `LLM_PROVIDER=openrouter` + `OPENROUTER_API_KEY`

4. Start Postgres + `pgvector`:

   ```bash
   pnpm db:up
   ```

5. Run migrations:

   ```bash
   pnpm db:migrate
   ```

6. Run API + web together:

   ```bash
   pnpm dev
   ```

7. Open `http://localhost:3000` and click **Generate corpus**.

### Runtime and cost expectations

- Default corpus size is `25`; generating `25` CVs should take a few minutes wall-clock on free tiers depending on provider latency/quota.
- The default stack is designed to minimize API costs by using local embeddings and free-tier model providers. Actual free-tier limits depend on the provider and account.

### CLI-first flow

If you prefer terminal execution:

```bash
pnpm generate:cvs -- --size 25 --seed 42
pnpm ingest:cvs
```

## Environment variables

> Full comments and provider notes live in `.env.example`.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/cv_screener` | Postgres connection |
| `GOOGLE_API_KEY` | Conditional | — | Required if `LLM_PROVIDER=gemini` (default path) |
| `OPENROUTER_API_KEY` | Conditional | — | Required if `LLM_PROVIDER=openrouter` |
| `LLM_PROVIDER` | No | `gemini` | `gemini` \| `openrouter` |
| `EMBEDDING_PROVIDER` | No | `local` | Local `multilingual-e5-small` (`384` dims) |
| `PORTRAIT_PROVIDER` | No | `gemini` | Falls back to deterministic local `svg` avatar |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | Web app API origin |

Most variables are optional and already have free-safe defaults.

## Tech stack

- **Frontend:** Next.js, React, TypeScript
- **Backend:** NestJS, TypeScript
- **Database:** PostgreSQL + pgvector
- **ORM:** Prisma
- **Validation/contracts:** Zod
- **Embeddings:** multilingual-e5-small
- **LLM:** Gemini / OpenRouter
- **Streaming:** SSE
- **Monorepo:** pnpm + Turborepo
- **Infrastructure:** Docker

## Architecture

The system has three pipelines and one feedback loop: generation, ingestion, and screening; screening pushes ranking back to the gallery in real time.

```mermaid
flowchart TB
  subgraph UI[Next.js Web App]
    A[Generate corpus]
    B[Candidate gallery]
    C[Chat panel]
  end

  subgraph GEN[Generation]
    G1[Persona plan] --> G2[LLM profile JSON] --> G3[Portrait] --> G4[HTML render] --> G5[PDF + profile persist]
  end

  subgraph ING[Ingestion]
    I1[PDF extract] --> I2[Section-aware chunks] --> I3[Embeddings e5-small 384] --> I4[Postgres + pgvector]
  end

  subgraph SCR[Screening]
    S1[Question] --> S2[Hybrid retrieval] --> S3[Rank fusion] --> S4[Grounded answer] --> S5[SSE tokens]
  end

  A --> G1
  G5 --> I1
  C --> S1
  I4 --> S2
  S3 -->|ranking| B
  B -.active filter context.-> C
```

## Free-tier stack

| Pipeline leg | Free default | Fallback | Cost impact |
| --- | --- | --- | --- |
| Text generation + grounded answers | Gemini `gemini-3.5-flash` (AI Studio free key) | OpenRouter free models | Free-tier quota |
| Embeddings | Local `@huggingface/transformers` + `multilingual-e5-small` (`384`) | Gemini embeddings (`1536`) | Local default is zero network / zero API cost |
| Portrait generation | Pollinations (keyless, stylized SANA) | Gemini / Hugging Face / local SVG | Keyless by default; hard fallback always works |
| Storage + retrieval | Postgres 17 + `pgvector` local Docker | N/A | Local only |

## Design decisions and tradeoffs

| Decision | Why | Tradeoff |
| --- | --- | --- |
| Postgres + `pgvector` over dedicated vector DB | One local stack for metadata + vectors; easy transactional consistency | Less specialized ANN tuning |
| Prisma + raw SQL for vectors | Keep ORM ergonomics while controlling `::vector` writes/queries | Raw SQL path must be maintained carefully |
| Local `384`-dim embeddings as default | Re-indexing is free and fast to iterate on | Lower semantic capacity than larger hosted models |
| Hybrid retrieval (dense + lexical + name) | Fixes exact-token misses (for example institution acronyms like `UPC`) | More moving parts and fusion tuning |
| JSON-first CV generation | Produces a strict typed profile alongside every PDF, which keeps generation and ingestion aligned | Extra schema design and validation work upfront |
| Section-aware chunking with identity prefixes | Improves grounding and candidate attribution in retrieval | Larger chunk payloads |
| Streaming generation instead of job queue | Immediate UI feedback and simpler prototype operations | Does not survive process restart like a durable queue |

## Known limitations and next steps

This is intentionally scoped as a take-home prototype rather than a production-ready screening platform.

- Add a reranker model on top of fused retrieval results.
- Add conversational memory so follow-up questions refine active gallery ranking.
- Tune retrieval arm weights based on real usage signals and offline query logs.
- Add PDF upload for real CVs.
- Introduce a durable job queue if generation must survive restarts.

## Repo map

```text
apps/
  api/                     NestJS API (port 3001)
    src/
      Cv/                  Bounded context: CV generation + ingestion
      Screening/           Bounded context: retrieval + grounded answering
      Shared/              Cross-cutting: Config, Prisma, Sse, Logger, errors, filters
    prisma/                schema.prisma + migrations
    test/                  unit/ and integration/
    storage/               Generated PDFs + profile JSON (gitignored)
  web/                     Next.js app (port 3000)
    src/
      domain/              Entities, value types, PORT interfaces
      application/         Use cases, orchestration. Depends on domain/ only
      infrastructure/      Port implementations: fetch/SSE clients, SWR hooks
      components/          UI composition and interaction only
      app/                 App Router segments, route handlers, metadata
packages/
  contracts/               zod schemas + inferred types shared by api and web
  ui/                      Design system: atoms/ → molecules/ → organisms/
  eslint-config/           Shared ESLint (base, next)
  typescript-config/       Shared tsconfig (base, next, node)
```
## Testing

The test suite covers the main domain and application paths, including:

- CV generation and template rendering
- PDF ingestion and chunking
- hybrid retrieval
- screening answer generation
- API contracts and infrastructure adapters

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install workspace dependencies |
| `pnpm dev` | Run API (`:3001`) + web (`:3000`) |
| `pnpm build` | Build all apps/packages |
| `pnpm lint` / `pnpm lint:fix` | Lint workspace |
| `pnpm typecheck` | TypeScript check across workspace |
| `pnpm test` | Run all tests |
| `pnpm db:up` / `pnpm db:down` / `pnpm db:reset` | Manage Postgres + `pgvector` |
| `pnpm db:migrate` / `pnpm db:migrate:dev` / `pnpm db:studio` / `pnpm db:generate` | Prisma workflow |
| `pnpm generate:cvs -- --size 25 --seed 42` | Run generation pipeline from CLI |
| `pnpm ingest:cvs` | Re-extract/chunk/embed/index existing PDFs |