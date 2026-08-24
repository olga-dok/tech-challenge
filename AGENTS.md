# AGENTS.md

> Instructions for AI coding agents and humans working on this repository.

## Project Overview

**AI-Powered CV Screener** — an end-to-end prototype that generates a corpus of realistic fake CVs
(PDF), indexes them for retrieval, and answers natural-language questions about the candidates with
grounded, cited answers.

The product is one screen with two halves that talk to each other:

- **Generate + browse** — one button builds 25 fake CVs; progress streams live and a candidate card
  (portrait, name, headline, skills) appears as each CV finishes. The gallery is paginated.
- **Ask** — the chat answers from the corpus with citations, *and* the gallery filters and reorders
  itself to the ranked candidates behind that answer. The chat is the query language for the
  gallery, not a detached widget.

Three pipelines back it:

1. **Generation** — persona plan → LLM structured JSON → portrait image → HTML template → PDF
2. **Ingestion** — PDF → text extraction → section-aware chunking → embeddings → Postgres/pgvector
3. **Screening** — question → hybrid retrieval (dense + lexical + name) → rank fusion → grounded
   LLM answer → SSE stream → chat text + gallery ranking

## Technology Stack

| Layer | Choice |
| --- | --- |
| Monorepo | Turborepo 2.x + pnpm workspaces |
| Backend | NestJS 11 (Express), TypeScript 5 strict |
| Frontend | Next.js 16 (App Router, React 19, React Compiler), Tailwind CSS 4, SWR |
| Database | PostgreSQL 17 + `pgvector`, accessed via Prisma |
| Client state | SWR for cached reads, zustand for the shared gallery filter |
| Validation | zod (shared schemas in `@repo/contracts`) |
| Testing | Jest (typed hand-written port stubs), React Testing Library |

**Every AI dependency runs on a free tier, and each sits behind a port so it can be swapped in one
file.** Defaults: Gemini 3.5 Flash (free AI Studio key) or an OpenRouter free model for text;
**local `@huggingface/transformers` + `multilingual-e5-small` (384 dims) for embeddings** — no quota, no network,
which is what makes re-indexing cheap enough to iterate on; Pollinations for portraits (keyless, though only
its stylised SANA model remains — `gemini` or Hugging Face for photorealism), falling back
to a deterministic local SVG avatar. Nothing in the pipeline may
fail because a free service was slow or rate-limited.

## Repository Layout

```
apps/
  api/                     NestJS API (port 3001)
    src/
      Cv/                  Bounded context: CV generation + ingestion
      Screening/           Bounded context: retrieval + grounded answering
      Shared/              Cross-cutting: Config, Prisma, Sse, Logger, errors, filters
    prisma/                schema.prisma + migrations
    test/                  unit/ and integration/ — NEVER put tests in src/
    storage/               Generated PDFs + profile JSON (gitignored)
  web/                     Next.js app (port 3000)
    src/
      domain/              Entities, value types, PORT interfaces. No framework imports
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

---

## Backend Rules (`apps/api`)

The backend follows **Domain-Driven Design with Hexagonal Architecture**. This is not decoration —
it is what makes the AI adapters swappable and the retrieval logic testable without a database.

### 1. Layer boundaries (strict)

Each bounded context has exactly three layers:

```
Cv/
├── Domain/           Pure business logic. NO external dependencies.
├── Application/      Use cases and application services. Imports Domain only.
└── Infrastructure/   Technical implementations. Imports Domain + Application + libs.
```

Dependencies flow **inward only**: `Infrastructure → Application → Domain`.

- `Domain/` must not import NestJS, Prisma, `@google/genai`, `fs`, or any other external package.
  If a domain file needs an external capability, define a **port** (interface) there and implement
  it in `Infrastructure/`.
- `Application/` must not use `@Inject()` or any NestJS decorator. Dependency injection is handled
  entirely by factories.

### 2. Module structure

```
Cv/
├── Domain/
│   ├── CandidateProfile.ts        Entity / aggregate
│   ├── Persona.ts                 Value object
│   ├── CvRepository.ts            Port (interface ONLY)
│   ├── ProfileDrafter.ts          Port for the LLM
│   └── CvGenerationError.ts       Domain error
├── Application/
│   ├── GenerateCvCorpusUseCase.ts Single execute() method
│   ├── GenerateCvCorpusRequest.ts Input DTO
│   └── CvIngester.ts              Application service (shared logic)
└── Infrastructure/
    ├── Action/                    Controllers
    ├── Factory/                   DI factories (REQUIRED for every injectable)
    ├── Persistence/               Repository implementations
    ├── Template/                  HTML templates for PDF rendering
    └── CvModule.ts                NestJS module
```

### 3. Factory pattern (mandatory)

Every injectable class has a factory file in `Infrastructure/Factory/` named
`ClassName.factory.ts`:

```typescript
export const GenerateCvCorpusUseCaseFactory = {
  provide: GenerateCvCorpusUseCase,
  useFactory: (repository: CvRepository, drafter: ProfileDrafter): GenerateCvCorpusUseCase =>
    new GenerateCvCorpusUseCase(repository, drafter),
  inject: [CvRepositoryId, ProfileDrafterId],
}
```

Ports are injected by `Symbol` token (e.g. `export const ProfileDrafterId = Symbol('ProfileDrafter')`),
since interfaces have no runtime value.

### 4. Use cases

```typescript
export class GenerateCvCorpusUseCase {
  constructor(
    private readonly repository: CvRepository,
    private readonly drafter: ProfileDrafter,
  ) {}

  async execute(request: GenerateCvCorpusRequest): Promise<GenerateCvCorpusSummary> {
    // 1. build domain objects
    // 2. execute business logic on them
    // 3. persist
    // 4. return a plain summary
  }
}
```

- One public `execute()` method.
- **Use cases MUST NOT call other use cases.** Extract shared logic into an application service
  (`CvIngester`, `CorpusPlanner`) and inject it into each.
- No framework decorators, no `process.env`, no direct IO.

### 5. Controllers are Actions

```typescript
@Controller('cvs')
export class GenerateCvCorpusAction {
  constructor(private readonly useCase: GenerateCvCorpusUseCase) {}

  @Post('generate')
  @HttpCode(202)
  async handle(@Body() body: GenerateCvCorpusBody): Promise<GenerateCvCorpusResponse> {
    return this.useCase.execute({ size: body.size, seed: body.seed })
  }
}
```

- Suffix `Action`, one `handle()` method, live in `Infrastructure/Action/`.
- Inject **use cases only** — never repositories or domain services.
- No business logic. Validate input with a DTO/zod pipe, return plain objects.
- Streaming endpoints return SSE via the shared `pipeEventStream` helper.

### 6. Repositories

- Interface in `Domain/`, technology-agnostic (`find`, `findAll`, `searchBySlug`, `persist`,
  `remove`).
- Implementation in `Infrastructure/Persistence/` (`PrismaCvRepository`).
- **Always return domain objects, never Prisma models.** Use a private `buildXxx()` reconstructor.
- Vector columns are `Unsupported("vector(384)")` in Prisma and must be read/written with
  `$queryRaw` / `$executeRaw` plus a `::vector` cast. Comment the raw SQL — it is the one place
  the ORM leaks. The dimension is fixed by migration: changing `EMBEDDING_DIMENSIONS` is a schema
  change, not a config change, and ingestion asserts the embedder's width matches at startup.

### 7. Domain patterns

Value objects are immutable and self-validating:

```typescript
export class Slug {
  private static readonly PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

  private constructor(readonly value: string) {
    this.ensureIsValid(value)
  }

  static from(value: string): Slug {
    return new Slug(value)
  }

  private ensureIsValid(value: string): void {
    if (!Slug.PATTERN.test(value)) {
      throw new InvalidSlugError(value)
    }
  }

  equals(other: Slug): boolean {
    return this.value === other.value
  }
}
```

- Private constructor, static factory (`from`, `fromString`, `create`), fail-fast validation,
  `equals()`.
- Entities expose business methods (`isSenior()`, `mentionsSkill()`), keep mutable state in
  `_prefixed` private fields.
- Pure algorithms (rank fusion, chunking, persona planning) live in `Domain/` as plain functions or
  classes with no IO — these are the highest-value unit tests in the repo.

### 8. Errors

```
BaseError            all custom errors extend this
└── HttpError        carries an HTTP status
    ├── NotFoundError / BadRequestError / UnprocessableError
    └── domain errors: CandidateNotFoundError, NoRelevantContextError, …
```

- Use cases throw **specific** domain errors, never a generic `Error` or a bare `NotFoundError`.
- Domain errors expose static constructors carrying context:
  `CandidateNotFoundError.fromSlug(slug)`.
- A global exception filter converts them to **RFC 7807 Problem Details**.
- Adapters that talk to flaky external systems (PDF parsing, LLM calls, image generation) return a
  **typed recoverable failure** rather than throwing, when the caller can sensibly continue. The CV
  pipeline must never die because one portrait or one PDF failed.

---

## Frontend Rules (`apps/web`)

Same architecture, client-side.

### 1. Layers

`app/` and `components/` → `infrastructure/` → `application/` → `domain/`. Inward only.

- `domain/` — entities, value types, and **port interfaces**. No `react`, no `next/*`, no `fetch`,
  no browser APIs. Deterministic and unit-testable in isolation.
- `application/` — use cases and orchestration. Depends on `domain/` only.
- `infrastructure/` — port implementations: the SSE fetch client, SWR hooks, the API proxy client.
- `components/` — UI composition and interaction only. No business rules beyond display/input.
- `app/` — App Router segments, route handlers, metadata. **Route folders only** — never put shared
  hooks or components in a non-route folder under `app/`.

### 2. Streaming contracts

There are two SSE streams — corpus generation and screening — and both follow the same shape: a
**discriminated union on `type`** defined once in `@repo/contracts`, plus a matching callbacks
interface.

```typescript
export type ScreeningStreamEvent =
  | { type: 'status'; stage: ScreeningStage }
  | { type: 'retrieval'; citations: Citation[]; ranking: RankedCandidate[] }
  | { type: 'token'; data: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface ScreeningStreamCallbacks {
  onStatus?: (stage: ScreeningStage) => void
  onRetrieval?: (citations: Citation[], ranking: RankedCandidate[]) => void
  onToken?: (data: string) => void
  onDone?: () => void
  onError?: (message: string) => void
}
```

`ranking` rides on the `retrieval` event rather than arriving at the end, so the gallery can reorder
the instant retrieval lands — while the answer text is still streaming.

One shared frame reader (`infrastructure/sse/read-event-stream.ts`) serves both streams. It must
buffer partial frames across chunk boundaries, honour `AbortSignal`, and surface transport errors
through `onError` rather than throwing.

### 3. Shared filter state

The chat writes the active ranking; the gallery reads it. That lives in a thin zustand store
(`{ question, ranking, isActive }` + `setRanking` / `clearRanking`). Keep derivation logic pure in
`domain/` — the store holds state, not rules. When a ranking is active the gallery fetches
candidates by ordered slugs so ordering comes from the server, and a visible filter chip with a
clear affordance is mandatory: a silently filtered gallery is a bug.

### 4. Conventions

- **File naming: kebab-case** (`screening-repository.ts`, `message-bubble.tsx`).
- **Named exports** for utilities and shared components; default export for a route's page.
- Import order: React → third-party → internal (`@/…`, `@repo/…`) → relative.
- Server Components by default; add `'use client'` only where interaction demands it.
- Data fetching: SWR for cached reads (candidate pages, corpus stats), the SSE clients for
  generation progress and streaming answers.
- Tailwind v4 utilities only — no new CSS files beyond `globals.css`.
- Genuinely generic UI goes in `packages/ui` (`atoms/` → `molecules/` → `organisms/`);
  app-specific composition stays in `apps/web/src/components`.
- Accessibility is not optional: keyboard reachable, visible focus rings, `aria-live` on the
  streaming region *and* on filter changes (a screen reader must be told the gallery changed),
  sensible empty/loading/error states, light and dark.

---

## Shared Rules

1. **No `any`.** Use `unknown` plus a narrowing guard when a type is genuinely open.
2. **Explicit return types** on every exported function and method.
3. **No `console.log`.** Use the injected logger (backend) or nothing (frontend).
4. **Comments explain *why*, never *what*.** Add one when a decision is non-obvious (a raw SQL
   cast, a dimension truncation, a deliberate fallback). Otherwise let the names carry it.
5. **No secrets in code or logs.** Configuration is read once at boot through the zod-validated
   config module; `process.env` is not read anywhere else.
6. **Tests live in `apps/api/test/`** (backend) or **alongside the source as `*.test.ts(x)`**
   (frontend). Never in `apps/api/src/`.
7. **`packages/contracts` is the single source of truth** for any shape that crosses the FE/BE
   boundary. Define it in zod, derive types with `z.infer` — never hand-write the same shape twice.

## Testing

Test at the layer where the logic lives, and write the test before the implementation for anything
with real logic.

| Layer | What to test | How |
| --- | --- | --- |
| `Domain/` | Rank fusion, chunking, persona planning, value-object validation | Pure unit tests, no mocks needed |
| `Application/` | Use case orchestration, error paths, idempotency | Unit tests with the ports stubbed |
| `Infrastructure/` | SQL correctness, retrieval arms, transactional rollback | Integration tests against a real Postgres+pgvector |
| `components/` | Rendering, interaction, streaming state transitions | React Testing Library — behaviour, not implementation |

Every behaviour change ships with a test at the closest effective layer. If a new implementation
contradicts an existing test's assertion, **stop and flag the conflict** rather than editing the
test to pass.

## Commands

Run from the repo root unless noted.

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Run api (:3001) and web (:3000) together via Turborepo |
| `pnpm build` | Build every package and app |
| `pnpm lint` / `pnpm lint:fix` | ESLint across the workspace |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm test` | Full test suite |
| `pnpm db:up` / `db:down` / `db:reset` | Postgres + pgvector via docker-compose |
| `pnpm db:migrate` / `db:migrate:dev` / `db:studio` / `db:generate` | Prisma migrations, studio, client generation |
| `pnpm generate:cvs -- --size 25 --seed 42` | Run the CV generation pipeline from the terminal (the UI button does the same thing) |
| `pnpm ingest:cvs` | Re-extract, chunk, embed, and index the existing PDFs |
| `pnpm eval` | Run the offline evaluation harness |

Before considering any task complete: `pnpm lint && pnpm typecheck && pnpm test` must pass.

## Working Agreements

- **Do not commit, branch, or push unless asked.** Propose it; let the human decide.
- Follow the existing patterns in the sibling bounded context before inventing a new one.
- **Prefer the free option and measure it.** Where a hosted service and a free/local one both work,
  take the free one and let the evaluation harness say whether it cost anything. A decision with a
  number attached beats an assumption.
- Keep scope tight. This is a prototype with a deadline — see `docs/EXECUTION-PLAN.md` for what is
  deliberately out of scope (auth, uploads, multi-tenancy, deployment).

## Where to Look

- `docs/EXECUTION-PLAN.md` — the build order, per-step briefs, and the reasoning behind each
  technical decision.
- `docs/architecture.md` — diagrams of the three pipelines.
- `README.md` — setup, environment variables, and evaluation results.
