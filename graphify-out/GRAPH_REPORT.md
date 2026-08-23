# Graph Report - tech-challenge  (2026-08-23)

## Corpus Check
- 278 files · ~78,341 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1739 nodes · 3651 edges · 123 communities (85 shown, 38 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 85 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a3a7edff`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- contracts/src/index.ts
- envSchema.ts
- Cv/Domain/index.ts
- HybridCvRetriever.ts
- devDependencies
- AI-Powered CV Screener (project overview)
- contracts/package.json
- cv-templates/package.json
- Embedder
- CvChunker.ts
- GenerateCvCorpusUseCase.ts
- cv-templates/src/index.ts
- Persona
- Candidate
- Http/index.ts
- tasks
- scripts
- Slug
- devDependencies
- scripts
- dependencies
- Logger
- ui/package.json
- PuppeteerPdfRenderer.ts
- Candidate.ts
- NestLogger
- profileDrafters.spec.ts
- Persona.ts
- compilerOptions
- compilerOptions
- compilerOptions
- jest
- validate.py
- api/tsconfig.json
- web/tsconfig.json
- contracts/tsconfig.build.json
- cv-templates/tsconfig.build.json
- CvModule.ts
- PortraitPainter.factory.ts
- exclude
- dotenv-cli
- Button.tsx
- ingest-cvs.ts
- .build
- caveman-compress/README.md
- cv-templates/tsconfig.json
- base.mjs
- contracts/tsconfig.json
- nest-cli.json
- probe-ai.ts
- IngestCvCorpusAction.spec.ts
- typescript-config/package.json
- cv/page.tsx
- generate-cvs.ts
- eslint
- eslint-config-prettier
- @eslint/eslintrc
- @eslint/js
- devDependencies
- Shared/Domain/index.ts
- Slug.ts
- @nestjs/cli
- @nestjs/schematics
- @nestjs/testing
- CvRetriever.factory.ts
- prisma
- @repo/eslint-config
- @repo/typescript-config
- source-map-support
- supertest
- ts-jest
- cavecrew/SKILL.md
- ts-node
- tsconfig-paths
- @types/express
- @types/jest
- @types/supertest
- typescript
- postcss.config.mjs
- Caveman Help
- Caveman Compress
- caveman/SKILL.md
- AppConfig
- caveman-commit
- caveman-explore/package.json
- caveman-learn/package.json
- caveman-review
- .fromAttributes
- CvIngester.ts
- Config/index.ts
- Review Caveman evidence
- Manage eval-gated experiments
- caveman-setup/SKILL.md
- normaliseProfile.ts
- Evaluate an optimization observation
- caveman-stats
- toGeminiResponseSchema.ts
- caveman-discover/SKILL.md
- CorpusRunLock
- skills/caveman-learn — the Caveman Learn editing skill (MIT, public)
- caveman-learn skill
- caveman-explore/tests/skill-file.test.mjs
- caveman-learn/tests/skill-file.test.mjs
- __init__.py
- investigate-first/SKILL.md
- lean-build/SKILL.md
- migration/SKILL.md
- safe-refactor/SKILL.md
- surgical-patch/SKILL.md
- verify-and-stop/SKILL.md
- moduleFileExtensions
- prettier
- @types/node
- typescript-eslint
- @nestjs/platform-express
- ListCandidatesAction.ts
- .handle
- @nestjs/common
- globals

## God Nodes (most connected - your core abstractions)
1. `Logger` - 64 edges
2. `Candidate` - 60 edges
3. `Slug` - 52 edges
4. `Persona` - 51 edges
5. `AppConfig` - 36 edges
6. `CvRepository` - 35 edges
7. `BaseError` - 27 edges
8. `HttpTransport` - 27 edges
9. `scripts` - 25 edges
10. `PortraitPainter` - 21 edges

## Surprising Connections (you probably didn't know these)
- `pnpm workspace config (apps/*, packages/*, allowBuilds)` --references--> `packages/contracts (zod schemas shared by api and web)`  [INFERRED]
  pnpm-workspace.yaml → AGENTS.md
- `pnpm workspace config (apps/*, packages/*, allowBuilds)` --references--> `packages/ui (design system: atoms → molecules → organisms)`  [INFERRED]
  pnpm-workspace.yaml → AGENTS.md
- `pnpm workspace config (apps/*, packages/*, allowBuilds)` --references--> `apps/web (Next.js app, port 3000)`  [INFERRED]
  pnpm-workspace.yaml → AGENTS.md
- `Section headings must match CV language (chunker relies on localized headings)` --rationale_for--> `Ingestion Pipeline (PDF → text extraction → chunking → embeddings → pgvector)`  [INFERRED]
  packages/cv-templates/README.md → AGENTS.md
- `No positive letter-spacing rule (Chromium glyph-tracking breaks pdf-parse)` --rationale_for--> `Ingestion Pipeline (PDF → text extraction → chunking → embeddings → pgvector)`  [INFERRED]
  packages/cv-templates/README.md → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Free-Tier AI Dependency Stack Behind Ports** — agents_free_tier_ai_ports, agents_ai_dependency_gemini, agents_ai_dependency_openrouter, agents_ai_dependency_embeddings, agents_ai_dependency_pollinations, agents_ai_dependency_svg_fallback [EXTRACTED 1.00]
- **Hexagonal Architecture Building Blocks** — agents_hexagonal_architecture, agents_layer_boundaries, agents_factory_pattern, agents_use_case_pattern, agents_controllers_actions, agents_repository_pattern [EXTRACTED 1.00]
- **Three Backing Pipelines: Generation, Ingestion, Screening** — agents_generation_pipeline, agents_ingestion_pipeline, agents_screening_pipeline [EXTRACTED 1.00]

## Communities (123 total, 38 thin omitted)

### Community 0 - "contracts/src/index.ts"
Cohesion: 0.06
Nodes (69): CandidatePageDto, CandidatePageSchema, CandidateSummaryDto, CandidateSummarySchema, ListCandidatesRequestDto, ListCandidatesRequestSchema, CandidateProfile, CandidateProfileSchema (+61 more)

### Community 1 - "envSchema.ts"
Cohesion: 0.15
Nodes (15): collectProviderProblems(), EMBEDDING_DEFAULTS, LLM_DEFAULT_MODELS, optionalString, PORTRAIT_DEFAULT_MODELS, portraitApiKey(), present(), RawEnv (+7 more)

### Community 2 - "Cv/Domain/index.ts"
Cohesion: 0.14
Nodes (26): MAX_CORPUS_SIZE, PlanningDecks, PersonaGender, CityProfile, CV_LANGUAGE_RING, DISTINCTIVE_TRAITS, GivenName, INTERNATIONAL_FAMILY_NAMES (+18 more)

### Community 3 - "HybridCvRetriever.ts"
Cohesion: 0.14
Nodes (12): Citation, CvRetriever, InvalidQuestionError, Question, RankedCandidate, reciprocalRankFusion(), RetrievalResult, RetrievedChunk (+4 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (47): dependencies, next, react, react-dom, @repo/contracts, @repo/cv-templates, @repo/ui, devDependencies (+39 more)

### Community 5 - "AI-Powered CV Screener (project overview)"
Cohesion: 0.07
Nodes (39): local @huggingface/transformers + multilingual-e5-small (384 dims), Gemini 3.5 Flash (free AI Studio key, text generation), OpenRouter free model (text generation alternative), Pollinations portrait generation (keyless, SANA model), Deterministic local SVG avatar fallback, Ask / Chat (query language for the gallery), Controllers as Actions (thin, use-case-only injection), AI-Powered CV Screener (project overview) (+31 more)

### Community 6 - "contracts/package.json"
Cohesion: 0.05
Nodes (38): dependencies, zod, devDependencies, eslint, jest, @repo/eslint-config, @repo/typescript-config, ts-jest (+30 more)

### Community 7 - "cv-templates/package.json"
Cohesion: 0.05
Nodes (38): dependencies, @repo/contracts, devDependencies, eslint, jest, @repo/eslint-config, @repo/typescript-config, ts-jest (+30 more)

### Community 8 - "Embedder"
Cohesion: 0.10
Nodes (12): Embedder, EmbedderId, EmbeddingFailedError, GeminiEmbedder, normalise(), responseSchema, ExtractorLoader, FeatureExtractor (+4 more)

### Community 9 - "CvChunker.ts"
Cohesion: 0.07
Nodes (29): bucketBySection(), chunkCv(), detectCvLanguage(), ENTRY_PER_CHUNK_SECTIONS, estimateTokens(), expandOversizePieces(), firstLine(), LANGUAGES (+21 more)

### Community 10 - "GenerateCvCorpusUseCase.ts"
Cohesion: 0.10
Nodes (26): CorpusIngester, CorpusIngesterId, GenerateCvCorpusDependencies, BatchPacing, CvStorage, CvStorageId, StoredCvFiles, CvRenderRequest (+18 more)

### Community 11 - "cv-templates/src/index.ts"
Cohesion: 0.27
Nodes (17): CvDocumentRequest, renderClassicTemplate(), renderCvHtml(), TEMPLATES, requestFor(), renderHeaderBandTemplate(), renderSidebarTemplate(), sampleProfile() (+9 more)

### Community 12 - "Persona"
Cohesion: 0.10
Nodes (9): GenerateCvCorpusRequest, GenerateCvCorpusUseCase, intoBatches(), nextBatchDelay(), CorpusPlan, isRateLimited(), Persona, PACING (+1 more)

### Community 13 - "Candidate"
Cohesion: 0.09
Nodes (4): PersonaOutcome, Candidate, PrismaCvRepository, RepositoryStub

### Community 14 - "Http/index.ts"
Cohesion: 0.10
Nodes (16): HttpTransportFactory, HttpModule, Module, HttpRequestFailedError, BinaryResponse, Fetch, HttpRequest, HttpTransport (+8 more)

### Community 15 - "tasks"
Cohesion: 0.09
Nodes (21): nextConfig, geistMono, geistSans, metadata, ^build, .next/**, dependsOn, outputs (+13 more)

### Community 16 - "scripts"
Cohesion: 0.08
Nodes (25): scripts, build, db:generate, db:migrate, db:migrate:dev, db:studio, dev, format (+17 more)

### Community 17 - "Slug"
Cohesion: 0.16
Nodes (3): ListCandidatesRequest, ListCandidatesResult, Slug

### Community 18 - "devDependencies"
Cohesion: 0.08
Nodes (23): @next/eslint-plugin-next, devDependencies, eslint, eslint-config-next, @eslint/js, eslint-plugin-prettier, globals, @next/eslint-plugin-next (+15 more)

### Community 19 - "scripts"
Cohesion: 0.08
Nodes (24): devDependencies, turbo, turbo, name, packageManager, private, scripts, build (+16 more)

### Community 20 - "dependencies"
Cohesion: 0.09
Nodes (23): dependencies, dotenv, @huggingface/transformers, @nestjs/core, pdf-parse, @prisma/client, puppeteer, reflect-metadata (+15 more)

### Community 21 - "Logger"
Cohesion: 0.23
Nodes (3): CvIngester, Logger, LlmConfig

### Community 22 - "ui/package.json"
Cohesion: 0.09
Nodes (21): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, devDependencies, @types/react, @types/react-dom (+13 more)

### Community 23 - "PuppeteerPdfRenderer.ts"
Cohesion: 0.18
Nodes (6): main(), PdfRenderingError, BrowserLauncher, PuppeteerPdfRenderer, Journal, request

### Community 24 - "Candidate.ts"
Cohesion: 0.13
Nodes (10): CandidateAttributes, CandidateFiles, PersonaFacts, CvChunk, EmbeddedCvChunk, CandidatePageCriteria, CorpusStats, CandidateRow (+2 more)

### Community 25 - "NestLogger"
Cohesion: 0.33
Nodes (4): LogContext, format(), NestLogger, RecordedLine

### Community 26 - "profileDrafters.spec.ts"
Cohesion: 0.10
Nodes (19): ProfileDraftingError, buildProfilePrompt(), buildRepairPrompt(), LANGUAGE_NAMES, ProfilePrompt, attempt(), AttemptResult, draftWithOneRetry() (+11 more)

### Community 27 - "Persona.ts"
Cohesion: 0.33
Nodes (5): templateIdFor(), PersonaAttributes, REQUIRED_TEXT_FIELDS, personaFixture(), render()

### Community 28 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 29 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, allowJs, incremental, jsx, lib, module, noEmit, plugins (+5 more)

### Community 30 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, emitDecoratorMetadata, experimentalDecorators, incremental, lib, module, moduleResolution (+5 more)

### Community 31 - "jest"
Cohesion: 0.15
Nodes (12): jest, collectCoverageFrom, coverageDirectory, rootDir, testEnvironment, testRegex, transform, name (+4 more)

### Community 32 - "validate.py"
Cohesion: 0.05
Nodes (65): benchmark_pair(), count_tokens(), main(), print_table(), Path, main(), print_usage(), backup_dir_for() (+57 more)

### Community 33 - "api/tsconfig.json"
Cohesion: 0.17
Nodes (11): compilerOptions, outDir, exclude, extends, include, dist, node_modules, @repo/typescript-config/node (+3 more)

### Community 34 - "web/tsconfig.json"
Cohesion: 0.17
Nodes (11): compilerOptions, paths, exclude, extends, include, node_modules, **/*.ts, next-env.d.ts (+3 more)

### Community 35 - "contracts/tsconfig.build.json"
Cohesion: 0.17
Nodes (11): compilerOptions, outDir, rootDir, exclude, extends, include, dist, node_modules (+3 more)

### Community 36 - "cv-templates/tsconfig.build.json"
Cohesion: 0.17
Nodes (11): compilerOptions, outDir, rootDir, exclude, extends, include, dist, node_modules (+3 more)

### Community 37 - "CvModule.ts"
Cohesion: 0.12
Nodes (15): CorpusStatsResult, GetCorpusStatsUseCase, ListCandidatesUseCase, CvRepository, CvRepositoryId, GetCorpusStatsAction, Controller, Get (+7 more)

### Community 38 - "PortraitPainter.factory.ts"
Cohesion: 0.12
Nodes (21): PortraitImage, PortraitPainter, PortraitPainterId, PortraitPaintingError, ageBand(), buildPortraitPrompt(), portraitSeed(), subject() (+13 more)

### Community 39 - "exclude"
Cohesion: 0.20
Nodes (9): exclude, extends, include, dist, node_modules, src/**/*.ts, **/*spec.ts, test (+1 more)

### Community 41 - "Button.tsx"
Cohesion: 0.36
Nodes (4): Button(), ButtonProps, buttonVariants, Input()

### Community 42 - "ingest-cvs.ts"
Cohesion: 0.33
Nodes (7): CliOptions, IngestCvsModule, main(), parseOptions(), render(), Module, loadConfigFromEnvironment()

### Community 43 - ".build"
Cohesion: 0.11
Nodes (7): buildDecks(), draw(), CyclicDeck, InvalidCorpusPlanError, SeededRandom, plan(), personaWith()

### Community 44 - "caveman-compress/README.md"
Cohesion: 0.09
Nodes (20): Before / After, Benchmarks, How It Work, <img src="../../docs/assets/dancing-rock.svg" width="20" height="20" alt="rock"/> Caveman (285 tokens), Install, Original (706 tokens), Part of Caveman, Security (+12 more)

### Community 45 - "cv-templates/tsconfig.json"
Cohesion: 0.25
Nodes (7): exclude, extends, include, dist, node_modules, @repo/typescript-config/base, src/**/*.ts

### Community 47 - "contracts/tsconfig.json"
Cohesion: 0.29
Nodes (6): exclude, extends, include, node_modules, @repo/typescript-config/base, src/**/*.ts

### Community 48 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 49 - "probe-ai.ts"
Cohesion: 0.11
Nodes (17): extensionFor(), main(), ProbeModule, seconds(), slugify(), Module, ConfigModule, Global (+9 more)

### Community 50 - "IngestCvCorpusAction.spec.ts"
Cohesion: 0.24
Nodes (8): IngestCvCorpusAction, Controller, CONFIG, embedderStub(), extractorStub(), TestCvModule, Module, useCaseFor()

### Community 51 - "typescript-config/package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 53 - "generate-cvs.ts"
Cohesion: 0.33
Nodes (7): CliOptions, GenerateCvsModule, main(), pad(), parseOptions(), render(), Module

### Community 58 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, eslint-plugin-prettier, jest, ts-loader, eslint-plugin-prettier, jest, ts-loader

### Community 59 - "Shared/Domain/index.ts"
Cohesion: 0.16
Nodes (8): CorpusAlreadyGeneratingError, PdfRendererFactory, ProfileDrafterFactory, BaseError, LoggerId, LoggerFactory, pipeEventStream(), RFC-7807

### Community 60 - "Slug.ts"
Cohesion: 0.20
Nodes (10): GetCandidateUseCase, CandidateNotFoundError, GetCandidateAction, Controller, GetCandidatePdfAction, Controller, GetCandidatePortraitAction, PORTRAIT_MIME_TYPES (+2 more)

### Community 64 - "CvRetriever.factory.ts"
Cohesion: 0.21
Nodes (9): AppModule, Module, CvModule, Module, bootstrap(), CvRetrieverId, CvRetrieverFactory, ScreeningModule (+1 more)

### Community 71 - "cavecrew/SKILL.md"
Cohesion: 0.14
Nodes (12): cavecrew, Example chaining, How to invoke, Model overrides, See also, What it does, Auto-clarity (inherited), Chaining patterns (+4 more)

### Community 81 - "Caveman Help"
Cohesion: 0.14
Nodes (12): caveman-help, Example output, How to invoke, See also, What it does, Caveman Help, Configure Default Mode, Deactivate (+4 more)

### Community 82 - "Caveman Compress"
Cohesion: 0.17
Nodes (11): Boundaries, Caveman Compress, Compress, Compression Rules, Pattern, Preserve EXACTLY (never modify), Preserve Structure, Process (+3 more)

### Community 83 - "caveman/SKILL.md"
Cohesion: 0.17
Nodes (10): caveman, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Intensity (+2 more)

### Community 84 - "AppConfig"
Cohesion: 0.21
Nodes (7): Inject, Inject, AppConfig, PrismaConnectionFactory, PrismaConnection, PrismaModule, Module

### Community 85 - "caveman-commit"
Cohesion: 0.18
Nodes (9): caveman-commit, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Examples (+1 more)

### Community 86 - "caveman-explore/package.json"
Cohesion: 0.18
Nodes (10): description, files, SKILL.md, license, name, private, scripts, test (+2 more)

### Community 87 - "caveman-learn/package.json"
Cohesion: 0.18
Nodes (10): description, files, SKILL.md, license, name, private, scripts, test (+2 more)

### Community 88 - "caveman-review"
Cohesion: 0.18
Nodes (9): caveman-review, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Examples (+1 more)

### Community 89 - ".fromAttributes"
Cohesion: 0.12
Nodes (14): InvalidSlugError, Get, Param, isFileNotFound(), Get, Param, Res, candidateFor() (+6 more)

### Community 90 - "CvIngester.ts"
Cohesion: 0.13
Nodes (14): IngestOutcome, sha256(), IngestCvCorpusRequest, IngestCvCorpusDependencies, IngestCvCorpusUseCase, mapWithConcurrency(), Tally, Inject (+6 more)

### Community 91 - "Config/index.ts"
Cohesion: 0.25
Nodes (9): APP_CONFIG, EmbeddingConfig, GenerationConfig, NodeEnv, ObservabilityConfig, PortraitConfig, CANDIDATE_PATHS, loadEnvFiles() (+1 more)

### Community 92 - "Review Caveman evidence"
Cohesion: 0.25
Nodes (7): Hard rules, Review Caveman evidence, Step 1 — Load context, Step 2 — Establish baseline, Step 3 — Test the leading explanation with traces, Step 4 — Inspect representative traces, Step 5 — Report

### Community 93 - "Manage eval-gated experiments"
Cohesion: 0.25
Nodes (7): Manage eval-gated experiments, Non-negotiable gates, Step 1 — Load project and experiment, Step 2 — Evaluate evidence, Step 3 — Propose one action, Step 4 — Block unsafe execution, Step 5 — Re-read after external operator action

### Community 94 - "caveman-setup/SKILL.md"
Cohesion: 0.25
Nodes (7): Failure templates (use verbatim, filled in — never soften), Rules (non-negotiable), Step 1 — Find every live LLM callsite, Step 2 — Pick the app slug, Step 3 — Wire each callsite, Step 4 — Verify with one real request, Step 5 — Report

### Community 95 - "normaliseProfile.ts"
Cohesion: 0.25
Nodes (6): byMostRecentFirst(), compare(), Experience, normaliseProfile(), rank(), Experience

### Community 96 - "Evaluate an optimization observation"
Cohesion: 0.29
Nodes (6): 1. Read the exact observations, 2. Ask the operator to choose, 3. Design a candidate and paired eval, 4. Apply only the approved candidate, 5. Report observations, not savings, Evaluate an optimization observation

### Community 97 - "caveman-stats"
Cohesion: 0.29
Nodes (5): caveman-stats, Example output, How to invoke, See also, What it does

### Community 98 - "toGeminiResponseSchema.ts"
Cohesion: 0.36
Nodes (8): asNullableUnion(), convert(), isNullType(), isObject(), JsonObject, resolveRef(), SUPPORTED_KEYWORDS, toGeminiResponseSchema()

### Community 99 - "caveman-discover/SKILL.md"
Cohesion: 0.33
Nodes (5): Step 1 — Inventory the workflows, Step 2 — Name them, Step 3 — Propose, then apply, Step 4 — Verify, Step 5 — Report

### Community 100 - "CorpusRunLock"
Cohesion: 0.12
Nodes (11): CorpusRunLock, GenerateCvCorpusAction, Body, Controller, Inject, Post, Res, Body (+3 more)

### Community 101 - "skills/caveman-learn — the Caveman Learn editing skill (MIT, public)"
Cohesion: 0.40
Nodes (4): Boundary (binding), Install path, Layout, skills/caveman-learn — the Caveman Learn editing skill (MIT, public)

### Community 102 - "caveman-learn skill"
Cohesion: 0.40
Nodes (4): caveman-learn skill, Honesty, Install, What it does

### Community 112 - "moduleFileExtensions"
Cohesion: 0.50
Nodes (4): moduleFileExtensions, ts, js, json

### Community 119 - "ListCandidatesAction.ts"
Cohesion: 0.24
Nodes (5): toCandidateSummary(), ListCandidatesAction, Controller, Get, Query

### Community 120 - ".handle"
Cohesion: 0.40
Nodes (4): isFileNotFound(), Get, Param, Res

## Knowledge Gaps
- **505 isolated node(s):** `name`, `version`, `license`, `private`, `type` (+500 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Logger` connect `Logger` to `CvRetriever.factory.ts`, `profileDrafters.spec.ts`, `CorpusRunLock`, `HybridCvRetriever.ts`, `PortraitPainter.factory.ts`, `Embedder`, `CvChunker.ts`, `GenerateCvCorpusUseCase.ts`, `Persona`, `Http/index.ts`, `PuppeteerPdfRenderer.ts`, `NestLogger`, `CvIngester.ts`, `Shared/Domain/index.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `Candidate` connect `Candidate` to `Cv/Domain/index.ts`, `CvModule.ts`, `CvChunker.ts`, `GenerateCvCorpusUseCase.ts`, `Persona`, `Slug`, `IngestCvCorpusAction.spec.ts`, `Logger`, `ListCandidatesAction.ts`, `Candidate.ts`, `.fromAttributes`, `CvIngester.ts`, `Slug.ts`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `Persona` connect `Persona` to `Cv/Domain/index.ts`, `PortraitPainter.factory.ts`, `CvChunker.ts`, `GenerateCvCorpusUseCase.ts`, `.build`, `Candidate.ts`, `profileDrafters.spec.ts`, `Persona.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `name`, `version`, `license` to the rest of the system?**
  _505 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `contracts/src/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.055379746835443035 - nodes in this community are weakly interconnected._
- **Should `Cv/Domain/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13949579831932774 - nodes in this community are weakly interconnected._
- **Should `HybridCvRetriever.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1358974358974359 - nodes in this community are weakly interconnected._