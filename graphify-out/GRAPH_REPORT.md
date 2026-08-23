# Graph Report - tech-challenge  (2026-08-23)

## Corpus Check
- Corpus is ~44,314 words - fits in a single context window. You may not need a graph.

## Summary
- 1220 nodes · 2466 edges · 81 communities (50 shown, 31 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.81)
- Token cost: 0 input · 51,657 output

## Community Hubs (Navigation)
- Candidate & CV Contracts (zod)
- CLI Scripts (generate/preview/probe)
- Corpus Planning & Batching
- CV Generation Domain Model
- Web App Dependencies
- AI-Powered CV Screener Overview
- Contracts Package Manifest
- CV-Templates Package Manifest
- Embedding Port & Errors
- Corpus Run Locking
- CV Storage & PDF Rendering Port
- CV Template Rendering
- Corpus Ingestion & Generation Use Case
- Candidate Entity
- HTTP Transport Infrastructure
- Web App Layout & Build Config
- API Package Scripts
- Candidate Domain & Repository
- ESLint Config Package Manifest
- Root Workspace Manifest
- API Package Dependencies
- Profile Drafter Port & Gemini Adapter
- UI Package Dependencies
- Domain Validation Errors
- Generation Integration Tests
- Logger Port & Infrastructure
- Profile Drafting Errors & Prompts
- Domain Unit Test Support
- TypeScript Base Config
- TypeScript Next.js Config
- TypeScript Node Config
- API Jest Config
- API TypeScript Config
- Web TypeScript Config
- Contracts Build Config
- CV-Templates Build Config
- Profile Normalisation
- Gemini JSON Schema Conversion
- API Build TypeScript Config
- API Dev Dependencies
- UI Atoms (Button/Input)
- CV Generation CLI Entry
- Persona Validation Errors
- Profile Drafter Unit Tests
- CV-Templates TypeScript Config
- ESLint Flat Configs
- Contracts TypeScript Config
- Nest CLI Config
- Puppeteer PDF Renderer
- API Package Identity
- TypeScript-Config Package Identity
- Web CV Preview Route
- NestJS Core Dependency
- API ESLint Dependency
- ESLint Config Prettier Dependency
- ESLint RC Dependency
- ESLint JS Dependency
- ESLint Prettier Plugin Dependency
- Globals Dependency
- Jest Dependency
- NestJS CLI Dependency
- NestJS Schematics Dependency
- NestJS Testing Dependency
- PDF Parse Dependency
- Prisma Dependency
- Repo ESLint Config Dependency
- Repo TypeScript Config Dependency
- Source Map Support Dependency
- Supertest Dependency
- TS-Jest Dependency
- TS-Loader Dependency
- TS-Node Dependency
- TSConfig-Paths Dependency
- Types/Express Dependency
- Types/Jest Dependency
- Types/Supertest Dependency
- TypeScript Dependency
- Web PostCSS Config

## God Nodes (most connected - your core abstractions)
1. `Persona` - 51 edges
2. `Logger` - 46 edges
3. `Candidate` - 37 edges
4. `HttpTransport` - 27 edges
5. `AppConfig` - 25 edges
6. `scripts` - 24 edges
7. `Slug` - 23 edges
8. `BaseError` - 23 edges
9. `PortraitPainter` - 21 edges
10. `PortraitImage` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Section headings must match CV language (chunker relies on localized headings)` --rationale_for--> `Ingestion Pipeline (PDF → text extraction → chunking → embeddings → pgvector)`  [INFERRED]
  packages/cv-templates/README.md → AGENTS.md
- `No positive letter-spacing rule (Chromium glyph-tracking breaks pdf-parse)` --rationale_for--> `Ingestion Pipeline (PDF → text extraction → chunking → embeddings → pgvector)`  [INFERRED]
  packages/cv-templates/README.md → AGENTS.md
- `pnpm workspace config (apps/*, packages/*, allowBuilds)` --references--> `apps/web (Next.js app, port 3000)`  [INFERRED]
  pnpm-workspace.yaml → AGENTS.md
- `pnpm workspace config (apps/*, packages/*, allowBuilds)` --references--> `packages/contracts (zod schemas shared by api and web)`  [INFERRED]
  pnpm-workspace.yaml → AGENTS.md
- `pnpm workspace config (apps/*, packages/*, allowBuilds)` --references--> `packages/ui (design system: atoms → molecules → organisms)`  [INFERRED]
  pnpm-workspace.yaml → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three Backing Pipelines: Generation, Ingestion, Screening** — agents_generation_pipeline, agents_ingestion_pipeline, agents_screening_pipeline [EXTRACTED 1.00]
- **Hexagonal Architecture Building Blocks** — agents_hexagonal_architecture, agents_layer_boundaries, agents_factory_pattern, agents_use_case_pattern, agents_controllers_actions, agents_repository_pattern [EXTRACTED 1.00]
- **Free-Tier AI Dependency Stack Behind Ports** — agents_free_tier_ai_ports, agents_ai_dependency_gemini, agents_ai_dependency_openrouter, agents_ai_dependency_embeddings, agents_ai_dependency_pollinations, agents_ai_dependency_svg_fallback [EXTRACTED 1.00]

## Communities (81 total, 31 thin omitted)

### Community 0 - "Candidate & CV Contracts (zod)"
Cohesion: 0.06
Nodes (65): CandidatePageDto, CandidatePageSchema, CandidateSummaryDto, CandidateSummarySchema, CandidateProfile, CandidateProfileSchema, Contact, ContactSchema (+57 more)

### Community 1 - "CLI Scripts (generate/preview/probe)"
Cohesion: 0.06
Nodes (45): GenerateCvsModule, Module, main(), extensionFor(), main(), ProbeModule, seconds(), slugify() (+37 more)

### Community 2 - "Corpus Planning & Batching"
Cohesion: 0.06
Nodes (41): BatchPacing, intoBatches(), nextBatchDelay(), buildDecks(), CorpusPlan, draw(), MAX_CORPUS_SIZE, PlanningDecks (+33 more)

### Community 3 - "CV Generation Domain Model"
Cohesion: 0.07
Nodes (23): Persona, PortraitPainter, PortraitPaintingError, PortraitPainterFactory, ageBand(), buildPortraitPrompt(), portraitSeed(), subject() (+15 more)

### Community 4 - "Web App Dependencies"
Cohesion: 0.04
Nodes (47): dependencies, next, react, react-dom, @repo/contracts, @repo/cv-templates, @repo/ui, devDependencies (+39 more)

### Community 5 - "AI-Powered CV Screener Overview"
Cohesion: 0.07
Nodes (39): local @huggingface/transformers + multilingual-e5-small (384 dims), Gemini 3.5 Flash (free AI Studio key, text generation), OpenRouter free model (text generation alternative), Pollinations portrait generation (keyless, SANA model), Deterministic local SVG avatar fallback, Ask / Chat (query language for the gallery), Controllers as Actions (thin, use-case-only injection), AI-Powered CV Screener (project overview) (+31 more)

### Community 6 - "Contracts Package Manifest"
Cohesion: 0.05
Nodes (38): dependencies, zod, devDependencies, eslint, jest, @repo/eslint-config, @repo/typescript-config, ts-jest (+30 more)

### Community 7 - "CV-Templates Package Manifest"
Cohesion: 0.05
Nodes (38): dependencies, @repo/contracts, devDependencies, eslint, jest, @repo/eslint-config, @repo/typescript-config, ts-jest (+30 more)

### Community 8 - "Embedding Port & Errors"
Cohesion: 0.10
Nodes (11): Embedder, EmbedderId, EmbeddingFailedError, GeminiEmbedder, normalise(), responseSchema, ExtractorLoader, FeatureExtractor (+3 more)

### Community 9 - "Corpus Run Locking"
Cohesion: 0.10
Nodes (11): CorpusAlreadyGeneratingError, CorpusRunLock, GenerateCvCorpusAction, CorpusRunLockFactory, pipeEventStream(), ZodValidationPipe, Body, Controller (+3 more)

### Community 10 - "CV Storage & PDF Rendering Port"
Cohesion: 0.17
Nodes (14): CvStorage, CvStorageId, StoredCvFiles, CvRenderRequest, PdfRenderer, PdfRendererId, PortraitImage, PortraitPainterId (+6 more)

### Community 11 - "CV Template Rendering"
Cohesion: 0.27
Nodes (17): CvDocumentRequest, renderClassicTemplate(), renderCvHtml(), TEMPLATES, requestFor(), renderHeaderBandTemplate(), renderSidebarTemplate(), sampleProfile() (+9 more)

### Community 12 - "Corpus Ingestion & Generation Use Case"
Cohesion: 0.14
Nodes (9): CorpusIngester, CorpusIngesterId, GenerateCvCorpusRequest, GenerateCvCorpusDependencies, GenerateCvCorpusUseCase, PersonaOutcome, toCandidateSummary(), CvRepository (+1 more)

### Community 14 - "HTTP Transport Infrastructure"
Cohesion: 0.18
Nodes (12): HttpTransportFactory, HttpModule, Module, BinaryResponse, Fetch, HttpRequest, RetryableError, DEFAULTS (+4 more)

### Community 15 - "Web App Layout & Build Config"
Cohesion: 0.09
Nodes (21): nextConfig, geistMono, geistSans, metadata, ^build, .next/**, dependsOn, outputs (+13 more)

### Community 16 - "API Package Scripts"
Cohesion: 0.08
Nodes (24): scripts, build, db:generate, db:migrate, db:migrate:dev, db:studio, dev, format (+16 more)

### Community 17 - "Candidate Domain & Repository"
Cohesion: 0.15
Nodes (9): CandidateAttributes, CandidateFiles, PersonaFacts, CvRepositoryId, fnv1a(), personaChecksum(), Slug, CvRepositoryFactory (+1 more)

### Community 18 - "ESLint Config Package Manifest"
Cohesion: 0.08
Nodes (23): @next/eslint-plugin-next, devDependencies, eslint, eslint-config-next, @eslint/js, eslint-plugin-prettier, globals, @next/eslint-plugin-next (+15 more)

### Community 19 - "Root Workspace Manifest"
Cohesion: 0.08
Nodes (23): devDependencies, turbo, turbo, name, packageManager, private, scripts, build (+15 more)

### Community 20 - "API Package Dependencies"
Cohesion: 0.09
Nodes (23): dependencies, dotenv, @huggingface/transformers, @nestjs/common, @nestjs/platform-express, @prisma/client, puppeteer, reflect-metadata (+15 more)

### Community 21 - "Profile Drafter Port & Gemini Adapter"
Cohesion: 0.23
Nodes (11): ProfileDrafter, ProfileDrafterId, ProfilePrompt, GeminiProfileDrafter, responseSchema, OpenRouterProfileDrafter, responseSchema, ProfileDrafterFactory (+3 more)

### Community 22 - "UI Package Dependencies"
Cohesion: 0.09
Nodes (21): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, devDependencies, @types/react, @types/react-dom (+13 more)

### Community 23 - "Domain Validation Errors"
Cohesion: 0.14
Nodes (5): InvalidSlugError, PdfRenderingError, BaseError, HttpRequestFailedError, RFC-7807

### Community 24 - "Generation Integration Tests"
Cohesion: 0.19
Nodes (14): CONFIG, TestCvModule, Module, useCaseFor(), DrafterStub, existingCandidateFor(), painterStub(), rateLimitError() (+6 more)

### Community 25 - "Logger Port & Infrastructure"
Cohesion: 0.19
Nodes (9): LogContext, LoggerId, LoggerFactory, LoggerModule, Global, Module, format(), NestLogger (+1 more)

### Community 26 - "Profile Drafting Errors & Prompts"
Cohesion: 0.18
Nodes (11): ProfileDraftingError, buildProfilePrompt(), buildRepairPrompt(), LANGUAGE_NAMES, attempt(), AttemptResult, draftWithOneRetry(), GenerateText (+3 more)

### Community 27 - "Domain Unit Test Support"
Cohesion: 0.18
Nodes (6): caughtError(), caughtRejection(), ATTRIBUTES, imageBase64, Journal, request

### Community 28 - "TypeScript Base Config"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 29 - "TypeScript Next.js Config"
Cohesion: 0.14
Nodes (13): compilerOptions, allowJs, incremental, jsx, lib, module, noEmit, plugins (+5 more)

### Community 30 - "TypeScript Node Config"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, emitDecoratorMetadata, experimentalDecorators, incremental, lib, module, moduleResolution (+5 more)

### Community 31 - "API Jest Config"
Cohesion: 0.15
Nodes (13): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+5 more)

### Community 33 - "API TypeScript Config"
Cohesion: 0.17
Nodes (11): compilerOptions, outDir, exclude, extends, include, dist, node_modules, @repo/typescript-config/node (+3 more)

### Community 34 - "Web TypeScript Config"
Cohesion: 0.17
Nodes (11): compilerOptions, paths, exclude, extends, include, node_modules, **/*.ts, next-env.d.ts (+3 more)

### Community 35 - "Contracts Build Config"
Cohesion: 0.17
Nodes (11): compilerOptions, outDir, rootDir, exclude, extends, include, dist, node_modules (+3 more)

### Community 36 - "CV-Templates Build Config"
Cohesion: 0.17
Nodes (11): compilerOptions, outDir, rootDir, exclude, extends, include, dist, node_modules (+3 more)

### Community 37 - "Profile Normalisation"
Cohesion: 0.25
Nodes (6): byMostRecentFirst(), compare(), Experience, normaliseProfile(), rank(), Experience

### Community 38 - "Gemini JSON Schema Conversion"
Cohesion: 0.36
Nodes (8): asNullableUnion(), convert(), isNullType(), isObject(), JsonObject, resolveRef(), SUPPORTED_KEYWORDS, toGeminiResponseSchema()

### Community 39 - "API Build TypeScript Config"
Cohesion: 0.20
Nodes (9): exclude, extends, include, dist, node_modules, src/**/*.ts, **/*spec.ts, test (+1 more)

### Community 40 - "API Dev Dependencies"
Cohesion: 0.22
Nodes (9): devDependencies, dotenv-cli, prettier, @types/node, typescript-eslint, prettier, @types/node, typescript-eslint (+1 more)

### Community 41 - "UI Atoms (Button/Input)"
Cohesion: 0.36
Nodes (4): Button(), ButtonProps, buttonVariants, Input()

### Community 42 - "CV Generation CLI Entry"
Cohesion: 0.36
Nodes (7): CliOptions, main(), pad(), parseOptions(), render(), CvModule, Module

### Community 44 - "Profile Drafter Unit Tests"
Cohesion: 0.25
Nodes (3): GEMINI_CONFIG, OPENROUTER_CONFIG, Recorded

### Community 45 - "CV-Templates TypeScript Config"
Cohesion: 0.25
Nodes (7): exclude, extends, include, dist, node_modules, @repo/typescript-config/base, src/**/*.ts

### Community 47 - "Contracts TypeScript Config"
Cohesion: 0.29
Nodes (6): exclude, extends, include, node_modules, @repo/typescript-config/base, src/**/*.ts

### Community 48 - "Nest CLI Config"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 50 - "API Package Identity"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 51 - "TypeScript-Config Package Identity"
Cohesion: 0.50
Nodes (3): name, private, version

## Knowledge Gaps
- **356 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+351 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Candidate` connect `Candidate Entity` to `Corpus Planning & Batching`, `CV Generation Domain Model`, `Corpus Ingestion & Generation Use Case`, `Candidate Domain & Repository`, `Generation Integration Tests`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `Persona` connect `CV Generation Domain Model` to `Drafter Adapters & HTTP Retry`, `Corpus Planning & Batching`, `CV Storage & PDF Rendering Port`, `Persona Validation Errors`, `Corpus Ingestion & Generation Use Case`, `Candidate Domain & Repository`, `Profile Drafter Port & Gemini Adapter`, `Generation Integration Tests`, `Profile Drafting Errors & Prompts`, `Domain Unit Test Support`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `Logger` connect `Profile Drafter Port & Gemini Adapter` to `CV Generation Domain Model`, `Embedding Port & Errors`, `Corpus Run Locking`, `CV Storage & PDF Rendering Port`, `Corpus Ingestion & Generation Use Case`, `HTTP Transport Infrastructure`, `Puppeteer PDF Renderer`, `Domain Validation Errors`, `Logger Port & Infrastructure`, `Profile Drafting Errors & Prompts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _356 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Candidate & CV Contracts (zod)` be split into smaller, more focused modules?**
  _Cohesion score 0.05824561403508772 - nodes in this community are weakly interconnected._
- **Should `CLI Scripts (generate/preview/probe)` be split into smaller, more focused modules?**
  _Cohesion score 0.05837837837837838 - nodes in this community are weakly interconnected._
- **Should `Corpus Planning & Batching` be split into smaller, more focused modules?**
  _Cohesion score 0.06342342342342343 - nodes in this community are weakly interconnected._