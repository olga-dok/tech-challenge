# Graph Report - api  (2026-08-23)

## Corpus Check
- 203 files · ~51,481 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1087 nodes · 3064 edges · 76 communities (47 shown, 29 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `28b5c283`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Cv/Domain/index.ts
- Persona
- profileDrafters.spec.ts
- Shared/Domain/index.ts
- CvIngester.spec.ts
- Http/index.ts
- AskQuestionAction.spec.ts
- generationDoubles.ts
- Candidate
- Question
- IngestCvCorpusAction.ts
- CvRepository
- scripts
- Slug
- PuppeteerPdfRenderer.ts
- dependencies
- CvModule.ts
- AnswerCvQuestionUseCase.spec.ts
- envSchema.ts
- CvChunker.ts
- ListCandidatesUseCase.ts
- CvIngester.factory.ts
- Logger
- IngestCvCorpusUseCase.ts
- .fromName
- jest
- HybridCvRetriever
- Prisma/index.ts
- tsconfig.json
- app.module.ts
- generate-cvs.ts
- ingest-cvs.ts
- probe-ai.ts
- .execute
- .handle
- exclude
- .handle
- Config/index.ts
- IngestCvCorpusAction.spec.ts
- devDependencies
- nest-cli.json
- GetCandidateAction
- GetCorpusStatsAction
- loadEnvFiles.ts
- package.json
- .build
- dotenv-cli
- eslint
- @eslint/eslintrc
- @eslint/js
- eslint-plugin-prettier
- globals
- @nestjs/cli
- @nestjs/schematics
- @nestjs/throttler
- @repo/cv-templates
- zod
- prettier
- prisma
- @repo/eslint-config
- @repo/typescript-config
- source-map-support
- supertest
- ts-jest
- ts-loader
- ts-node
- tsconfig-paths
- @types/express
- @types/jest
- @types/node
- @types/supertest
- typescript
- typescript-eslint

## God Nodes (most connected - your core abstractions)
1. `Logger` - 77 edges
2. `Candidate` - 62 edges
3. `Slug` - 56 edges
4. `Persona` - 51 edges
5. `AppConfig` - 38 edges
6. `CvRepository` - 35 edges
7. `HttpTransport` - 33 edges
8. `BaseError` - 27 edges
9. `scripts` - 25 edges
10. `PortraitPainter` - 21 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `loadConfigFromEnvironment()`  [EXTRACTED]
  scripts/generate-cvs.ts → src/Shared/Infrastructure/Config/loadAppConfig.ts
- `main()` --calls--> `loadConfigFromEnvironment()`  [EXTRACTED]
  scripts/probe-ai.ts → src/Shared/Infrastructure/Config/loadAppConfig.ts
- `RepositoryStub` --references--> `Candidate`  [EXTRACTED]
  test/support/generationDoubles.ts → src/Cv/Domain/Candidate.ts
- `RawChunk` --references--> `EmbeddedCvChunk`  [EXTRACTED]
  test/integration/Screening/HybridCvRetriever.spec.ts → src/Cv/Domain/CvChunk.ts
- `ReplaceChunksCall` --references--> `EmbeddedCvChunk`  [EXTRACTED]
  test/support/generationDoubles.ts → src/Cv/Domain/CvChunk.ts

## Import Cycles
- None detected.

## Communities (76 total, 29 thin omitted)

### Community 0 - "Cv/Domain/index.ts"
Cohesion: 0.05
Nodes (52): GenerateCvCorpusRequest, GenerateCvCorpusDependencies, GenerateCvCorpusUseCase, PersonaOutcome, toCandidateSummary(), CandidateAttributes, CandidateFiles, PersonaFacts (+44 more)

### Community 1 - "Persona"
Cohesion: 0.07
Nodes (27): Persona, PortraitImage, PortraitPainter, PortraitPainterId, PortraitPaintingError, PortraitPainterFactory, ageBand(), buildPortraitPrompt() (+19 more)

### Community 2 - "profileDrafters.spec.ts"
Cohesion: 0.06
Nodes (36): isRateLimited(), ProfileDrafter, ProfileDrafterId, ProfileDraftingError, buildProfilePrompt(), buildRepairPrompt(), LANGUAGE_NAMES, ProfilePrompt (+28 more)

### Community 3 - "Shared/Domain/index.ts"
Cohesion: 0.06
Nodes (19): Catch, RFC-7807, InvalidPersonaError, InvalidSlugError, NoRelevantContextError, BadRequestError, BaseError, ConflictError (+11 more)

### Community 4 - "CvIngester.spec.ts"
Cohesion: 0.09
Nodes (12): Embedder, EmbedderId, EmbeddingFailedError, GeminiEmbedder, normalise(), responseSchema, ExtractorLoader, FeatureExtractor (+4 more)

### Community 5 - "Http/index.ts"
Cohesion: 0.11
Nodes (15): HttpTransportFactory, HttpModule, Module, HttpRequestFailedError, BinaryResponse, Fetch, HttpRequest, HttpTransport (+7 more)

### Community 6 - "AskQuestionAction.spec.ts"
Cohesion: 0.12
Nodes (18): GetCorpusStatsUseCase, AnswerCvQuestionUseCase, toCitationDto(), toRankedCandidateDto(), AskQuestionRequest, CvRetriever, CvRetrieverId, GroundedAnswererId (+10 more)

### Community 7 - "generationDoubles.ts"
Cohesion: 0.12
Nodes (20): CvStorage, CvStorageId, StoredCvFiles, CvStorageFactory, EXTENSIONS, FileSystemCvStorage, CONFIG, TestCvModule (+12 more)

### Community 9 - "Question"
Cohesion: 0.14
Nodes (10): RetrievedContext, GroundedAnsweringError, InvalidQuestionError, Question, AnswerPrompt, buildAnswerPrompt(), chunkSchema, chunkSchema (+2 more)

### Community 10 - "IngestCvCorpusAction.ts"
Cohesion: 0.10
Nodes (15): CorpusAlreadyGeneratingError, CorpusRunLock, GenerateCvCorpusAction, Body, Controller, Inject, Post, Res (+7 more)

### Community 11 - "CvRepository"
Cohesion: 0.12
Nodes (10): CvIngester, sha256(), CvChunk, EmbeddedCvChunk, CandidatePageCriteria, CorpusStats, CvRepository, CandidateRow (+2 more)

### Community 12 - "scripts"
Cohesion: 0.08
Nodes (25): scripts, build, db:generate, db:migrate, db:migrate:dev, db:studio, dev, format (+17 more)

### Community 13 - "Slug"
Cohesion: 0.20
Nodes (6): GetCandidateUseCase, CandidateNotFoundError, Slug, PORTRAIT_MIME_TYPES, AppConfig, ZodValidationPipe

### Community 14 - "PuppeteerPdfRenderer.ts"
Cohesion: 0.14
Nodes (9): CvRenderRequest, PdfRenderer, PdfRendererId, PdfRenderingError, PdfRendererFactory, BrowserLauncher, PuppeteerPdfRenderer, Journal (+1 more)

### Community 15 - "dependencies"
Cohesion: 0.09
Nodes (23): dotenv, @huggingface/transformers, @nestjs/common, @nestjs/core, @nestjs/platform-express, dependencies, dotenv, @huggingface/transformers (+15 more)

### Community 16 - "CvModule.ts"
Cohesion: 0.20
Nodes (11): CorpusIngester, CorpusIngesterId, CorpusStatsResult, CvRepositoryId, CvRepositoryFactory, GenerateCvCorpusUseCaseFactory, GetCandidateUseCaseFactory, GetCorpusStatsUseCaseFactory (+3 more)

### Community 17 - "AnswerCvQuestionUseCase.spec.ts"
Cohesion: 0.21
Nodes (8): Citation, CorpusNotIngestedError, GroundedAnswer, RankedCandidate, reciprocalRankFusion(), RetrievalResult, ArmRow, SECTION_LABELS

### Community 18 - "envSchema.ts"
Cohesion: 0.15
Nodes (15): collectProviderProblems(), EMBEDDING_DEFAULTS, LLM_DEFAULT_MODELS, optionalString, PORTRAIT_DEFAULT_MODELS, portraitApiKey(), present(), RawEnv (+7 more)

### Community 19 - "CvChunker.ts"
Cohesion: 0.18
Nodes (17): bucketBySection(), chunkCv(), detectCvLanguage(), ENTRY_PER_CHUNK_SECTIONS, estimateTokens(), expandOversizePieces(), firstLine(), LANGUAGES (+9 more)

### Community 20 - "ListCandidatesUseCase.ts"
Cohesion: 0.16
Nodes (7): Query, ListCandidatesRequest, ListCandidatesResult, ListCandidatesUseCase, ListCandidatesAction, Controller, Get

### Community 21 - "CvIngester.factory.ts"
Cohesion: 0.22
Nodes (10): TextExtractionFailureReason, TextExtractionResult, TextExtractor, TextExtractorId, DEFAULT_MAX_PDF_BYTES, PdfParseTextExtractor, CvIngesterFactory, TextExtractorFactory (+2 more)

### Community 22 - "Logger"
Cohesion: 0.24
Nodes (6): GroundedAnswerer, GeminiGroundedAnswerer, OpenRouterGroundedAnswerer, AnswererFactory, Logger, LlmConfig

### Community 23 - "IngestCvCorpusUseCase.ts"
Cohesion: 0.21
Nodes (10): IngestOutcome, IngestCvCorpusRequest, IngestCvCorpusDependencies, IngestCvCorpusUseCase, mapWithConcurrency(), Tally, embedderStub(), extractorStub() (+2 more)

### Community 24 - ".fromName"
Cohesion: 0.21
Nodes (11): candidateFor(), candidateFor(), candidateWith(), candidateFor(), candidateFor(), candidateNamed(), candidateFor(), candidateFor() (+3 more)

### Community 25 - "jest"
Cohesion: 0.15
Nodes (13): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+5 more)

### Community 26 - "HybridCvRetriever"
Cohesion: 0.37
Nodes (3): RetrievedChunk, HybridCvRetriever, sectionLabel()

### Community 27 - "Prisma/index.ts"
Cohesion: 0.31
Nodes (4): PrismaConnectionFactory, PrismaConnection, PrismaModule, Module

### Community 28 - "tsconfig.json"
Cohesion: 0.17
Nodes (11): @repo/typescript-config/node, scripts/**/*.ts, test/**/*.ts, compilerOptions, outDir, exclude, extends, include (+3 more)

### Community 29 - "app.module.ts"
Cohesion: 0.21
Nodes (8): AppModule, Module, bootstrap(), ScreeningModule, Module, ConfigModule, Global, Module

### Community 30 - "generate-cvs.ts"
Cohesion: 0.25
Nodes (9): CliOptions, GenerateCvsModule, main(), pad(), parseOptions(), render(), Module, CvModule (+1 more)

### Community 31 - "ingest-cvs.ts"
Cohesion: 0.27
Nodes (8): CliOptions, IngestCvsModule, main(), parseOptions(), render(), Module, main(), loadConfigFromEnvironment()

### Community 32 - "probe-ai.ts"
Cohesion: 0.25
Nodes (9): extensionFor(), main(), ProbeModule, seconds(), slugify(), Module, LoggerModule, Global (+1 more)

### Community 33 - ".execute"
Cohesion: 0.18
Nodes (7): GetCandidatePortraitAction, isFileNotFound(), Controller, Get, Inject, Param, Res

### Community 34 - ".handle"
Cohesion: 0.20
Nodes (5): Body, Post, Res, pipeEventStream(), Throttle

### Community 35 - "exclude"
Cohesion: 0.20
Nodes (9): **/*spec.ts, test, ./tsconfig.json, exclude, extends, include, dist, node_modules (+1 more)

### Community 36 - ".handle"
Cohesion: 0.22
Nodes (7): GetCandidatePdfAction, isFileNotFound(), Controller, Get, Inject, Param, Res

### Community 37 - "Config/index.ts"
Cohesion: 0.44
Nodes (6): APP_CONFIG, EmbeddingConfig, GenerationConfig, NodeEnv, ObservabilityConfig, PortraitConfig

### Community 38 - "IngestCvCorpusAction.spec.ts"
Cohesion: 0.31
Nodes (6): CONFIG, embedderStub(), extractorStub(), TestCvModule, Module, useCaseFor()

### Community 39 - "devDependencies"
Cohesion: 0.29
Nodes (7): eslint-config-prettier, jest, @nestjs/testing, devDependencies, eslint-config-prettier, jest, @nestjs/testing

### Community 40 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 41 - "GetCandidateAction"
Cohesion: 0.33
Nodes (4): GetCandidateAction, Controller, Get, Param

### Community 42 - "GetCorpusStatsAction"
Cohesion: 0.40
Nodes (3): GetCorpusStatsAction, Controller, Get

### Community 43 - "loadEnvFiles.ts"
Cohesion: 0.50
Nodes (3): CANDIDATE_PATHS, loadEnvFiles(), TRACKED_KEYS

### Community 44 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

## Knowledge Gaps
- **158 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+153 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Logger` connect `Logger` to `Cv/Domain/index.ts`, `Persona`, `profileDrafters.spec.ts`, `Shared/Domain/index.ts`, `CvIngester.spec.ts`, `.handle`, `AskQuestionAction.spec.ts`, `Http/index.ts`, `Question`, `IngestCvCorpusAction.ts`, `CvRepository`, `Slug`, `PuppeteerPdfRenderer.ts`, `CvModule.ts`, `AnswerCvQuestionUseCase.spec.ts`, `CvIngester.factory.ts`, `IngestCvCorpusUseCase.ts`, `HybridCvRetriever`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `Candidate` connect `Candidate` to `Cv/Domain/index.ts`, `Persona`, `.execute`, `CvIngester.spec.ts`, `IngestCvCorpusAction.spec.ts`, `AskQuestionAction.spec.ts`, `generationDoubles.ts`, `CvRepository`, `Slug`, `CvModule.ts`, `AnswerCvQuestionUseCase.spec.ts`, `ListCandidatesUseCase.ts`, `IngestCvCorpusUseCase.ts`, `.fromName`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `Slug` connect `Slug` to `Cv/Domain/index.ts`, `.execute`, `Persona`, `CvIngester.spec.ts`, `IngestCvCorpusAction.spec.ts`, `generationDoubles.ts`, `Candidate`, `Question`, `AskQuestionAction.spec.ts`, `CvRepository`, `.ensureIsValid`, `CvModule.ts`, `AnswerCvQuestionUseCase.spec.ts`, `ListCandidatesUseCase.ts`, `IngestCvCorpusUseCase.ts`, `.fromName`, `HybridCvRetriever`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _158 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cv/Domain/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0507048180096781 - nodes in this community are weakly interconnected._
- **Should `Persona` be split into smaller, more focused modules?**
  _Cohesion score 0.07033248081841433 - nodes in this community are weakly interconnected._
- **Should `profileDrafters.spec.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05924978687127025 - nodes in this community are weakly interconnected._