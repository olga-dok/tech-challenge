import { resolve } from 'node:path';
import { z } from 'zod';
import type { AppConfig } from './AppConfig';
import type { ConfigProblem } from './InvalidConfigurationError';

const LLM_DEFAULT_MODELS = {
  gemini: 'gemini-2.5-flash',
  openrouter: 'deepseek/deepseek-chat-v3:free',
} as const;

const EMBEDDING_DEFAULTS = {
  local: { model: 'multilingual-e5-small', dimensions: 384 },
  gemini: { model: 'gemini-embedding-001', dimensions: 1536 },
} as const;

const PORTRAIT_DEFAULT_MODELS = {
  pollinations: 'flux',
  huggingface: 'black-forest-labs/FLUX.1-schnell',
  svg: null,
} as const;

/**
 * Treats empty strings as absent. Shell exports and `.env` files routinely
 * produce `KEY=`, which would otherwise satisfy a plain `z.string()` and let a
 * blank API key through to the first request.
 */
const optionalString = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

const integerFromEnv = (min: number, max: number) =>
  z.coerce.number().int().min(min).max(max);

export const rawEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: integerFromEnv(1, 65535).default(3001),
  DATABASE_URL: z
    // The `error` override matters for the absent case: a bare `z.string()`
    // reports "expected string, received undefined", which tells a first-time
    // reader nothing about how to fix it.
    .string({
      error:
        'is required — run `pnpm db:up` and copy the URL from .env.example',
    })
    .trim()
    .min(1, 'is required — run `pnpm db:up` and copy the URL from .env.example')
    .refine(
      (value) =>
        value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'must be a postgresql:// connection string',
    ),
  CV_STORAGE_DIR: z.string().trim().default('./apps/api/storage'),

  LLM_PROVIDER: z.enum(['gemini', 'openrouter']).default('gemini'),
  GOOGLE_API_KEY: optionalString,
  OPENROUTER_API_KEY: optionalString,
  LLM_TEXT_MODEL: optionalString,

  EMBEDDING_PROVIDER: z.enum(['local', 'gemini']).default('local'),
  EMBEDDING_MODEL: optionalString,
  EMBEDDING_DIMENSIONS: integerFromEnv(64, 2000).optional(),

  PORTRAIT_PROVIDER: z
    .enum(['pollinations', 'huggingface', 'svg'])
    .default('pollinations'),
  PORTRAIT_MODEL: optionalString,
  HUGGINGFACE_API_KEY: optionalString,

  GENERATION_BATCH_SIZE: integerFromEnv(1, 16).default(5),
  GENERATION_BATCH_DELAY_MS: integerFromEnv(0, 120_000).default(1_500),
  GENERATION_BATCH_BACKOFF_FACTOR: z.coerce.number().min(1).max(10).default(2),
  GENERATION_MAX_BATCH_DELAY_MS: integerFromEnv(0, 600_000).default(60_000),
  CORPUS_DEFAULT_SIZE: integerFromEnv(1, 40).default(30),
  CORPUS_SEED: integerFromEnv(0, Number.MAX_SAFE_INTEGER).default(42),

  LANGFUSE_PUBLIC_KEY: optionalString,
  LANGFUSE_SECRET_KEY: optionalString,
  LANGFUSE_BASE_URL: z.url().default('https://cloud.langfuse.com'),
});

type RawEnv = z.infer<typeof rawEnvSchema>;

const present = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Cross-field rules, deliberately kept out of the schema and run against the
 * raw environment.
 *
 * zod skips `superRefine` whenever any field-level check has already failed,
 * which would mean a fresh clone missing both `DATABASE_URL` and an API key
 * only ever hears about the first one — and fixes one variable per restart.
 * Reading the raw strings here costs a little duplication and makes the
 * reported problem list complete on the first run.
 *
 * A provider whose value is not a recognised member is skipped: the enum error
 * from the schema already says everything useful about it.
 */
export function collectProviderProblems(
  source: NodeJS.ProcessEnv,
): ConfigProblem[] {
  const problems: ConfigProblem[] = [];
  const llmProvider = source.LLM_PROVIDER ?? 'gemini';
  const embeddingProvider = source.EMBEDDING_PROVIDER ?? 'local';
  const portraitProvider = source.PORTRAIT_PROVIDER ?? 'pollinations';

  if (llmProvider === 'gemini' && !present(source.GOOGLE_API_KEY)) {
    problems.push({
      variable: 'GOOGLE_API_KEY',
      message:
        'is required when LLM_PROVIDER=gemini — get a free key at https://aistudio.google.com/apikey',
    });
  }

  if (llmProvider === 'openrouter' && !present(source.OPENROUTER_API_KEY)) {
    problems.push({
      variable: 'OPENROUTER_API_KEY',
      message:
        'is required when LLM_PROVIDER=openrouter — get a free key at https://openrouter.ai/settings/keys',
    });
  }

  if (embeddingProvider === 'gemini' && !present(source.GOOGLE_API_KEY)) {
    problems.push({
      variable: 'GOOGLE_API_KEY',
      message:
        'is required when EMBEDDING_PROVIDER=gemini (or use the default EMBEDDING_PROVIDER=local, which needs no key)',
    });
  }

  if (
    portraitProvider === 'huggingface' &&
    !present(source.HUGGINGFACE_API_KEY)
  ) {
    problems.push({
      variable: 'HUGGINGFACE_API_KEY',
      message:
        'is required when PORTRAIT_PROVIDER=huggingface — get a free token at https://huggingface.co/settings/tokens',
    });
  }

  const langfuseKeys = [source.LANGFUSE_PUBLIC_KEY, source.LANGFUSE_SECRET_KEY];
  if (langfuseKeys.some(present) && !langfuseKeys.every(present)) {
    problems.push({
      variable: 'LANGFUSE_SECRET_KEY',
      message:
        'Langfuse needs both LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY, or neither (tracing is optional)',
    });
  }

  return problems;
}

export function toAppConfig(env: RawEnv): AppConfig {
  const embeddingDefaults = EMBEDDING_DEFAULTS[env.EMBEDDING_PROVIDER];
  const observabilityEnabled = Boolean(
    env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY,
  );

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    storageDir: resolve(process.cwd(), env.CV_STORAGE_DIR),
    llm: {
      provider: env.LLM_PROVIDER,
      apiKey:
        env.LLM_PROVIDER === 'gemini'
          ? // Non-null is safe here: collectProviderProblems has already
            // rejected the provider/key mismatch before this runs.
            (env.GOOGLE_API_KEY as string)
          : (env.OPENROUTER_API_KEY as string),
      textModel: env.LLM_TEXT_MODEL ?? LLM_DEFAULT_MODELS[env.LLM_PROVIDER],
    },
    embedding: {
      provider: env.EMBEDDING_PROVIDER,
      model: env.EMBEDDING_MODEL ?? embeddingDefaults.model,
      dimensions: env.EMBEDDING_DIMENSIONS ?? embeddingDefaults.dimensions,
      apiKey:
        env.EMBEDDING_PROVIDER === 'gemini'
          ? (env.GOOGLE_API_KEY as string)
          : null,
    },
    portrait: {
      provider: env.PORTRAIT_PROVIDER,
      model:
        env.PORTRAIT_MODEL ?? PORTRAIT_DEFAULT_MODELS[env.PORTRAIT_PROVIDER],
      apiKey:
        env.PORTRAIT_PROVIDER === 'huggingface'
          ? (env.HUGGINGFACE_API_KEY as string)
          : null,
    },
    generation: {
      batchSize: env.GENERATION_BATCH_SIZE,
      batchDelayMs: env.GENERATION_BATCH_DELAY_MS,
      batchBackoffFactor: env.GENERATION_BATCH_BACKOFF_FACTOR,
      maxBatchDelayMs: env.GENERATION_MAX_BATCH_DELAY_MS,
      defaultCorpusSize: env.CORPUS_DEFAULT_SIZE,
      seed: env.CORPUS_SEED,
    },
    observability: {
      enabled: observabilityEnabled,
      publicKey: env.LANGFUSE_PUBLIC_KEY ?? null,
      secretKey: env.LANGFUSE_SECRET_KEY ?? null,
      baseUrl: env.LANGFUSE_BASE_URL,
    },
  };
}
