// Imported from the concrete modules rather than the barrel: the barrel also
// exports the Nest module, and pulling that into a unit test would load the
// framework and read the ambient .env for no benefit.
import { InvalidConfigurationError } from '../../../../../src/Shared/Infrastructure/Config/InvalidConfigurationError';
import { loadAppConfig } from '../../../../../src/Shared/Infrastructure/Config/loadAppConfig';

const MINIMAL_ENV = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/cv_screener',
  GOOGLE_API_KEY: 'test-google-key',
} satisfies NodeJS.ProcessEnv;

const envWith = (overrides: NodeJS.ProcessEnv): NodeJS.ProcessEnv => ({
  ...MINIMAL_ENV,
  ...overrides,
});

// `InvalidConfigurationError` has a private constructor (static factories only),
// so it cannot be handed to `toThrow` as a constructable — assert on the caught
// value instead.
const expectProblem = (env: NodeJS.ProcessEnv, expected: string): void => {
  let caught: unknown;
  try {
    loadAppConfig(env);
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(InvalidConfigurationError);
  expect((caught as Error).message).toContain(expected);
};

describe('loadAppConfig', () => {
  describe('when only the required variables are set', () => {
    it('applies the free-tier defaults', () => {
      const config = loadAppConfig(MINIMAL_ENV);

      expect(config.port).toBe(3001);
      expect(config.nodeEnv).toBe('development');
      expect(config.llm).toMatchObject({
        provider: 'gemini',
        apiKey: 'test-google-key',
        textModel: 'gemini-3.5-flash',
      });
      expect(config.embedding).toMatchObject({
        provider: 'local',
        model: 'multilingual-e5-small',
        dimensions: 384,
        apiKey: null,
      });
      expect(config.portrait.provider).toBe('pollinations');
      expect(config.generation).toEqual({
        batchSize: 5,
        batchDelayMs: 1_500,
        batchBackoffFactor: 2,
        maxBatchDelayMs: 60_000,
        defaultCorpusSize: 25,
        seed: 42,
      });
      expect(config.observability.enabled).toBe(false);
    });

    it('resolves the storage directory to an absolute path', () => {
      const config = loadAppConfig(MINIMAL_ENV);

      expect(config.storageDir.startsWith('/')).toBe(true);
    });
  });

  describe('when a required variable is missing', () => {
    it('rejects an absent DATABASE_URL', () => {
      expectProblem({ GOOGLE_API_KEY: 'k' }, 'DATABASE_URL');
    });

    it('rejects a non-postgres DATABASE_URL', () => {
      expectProblem(
        envWith({ DATABASE_URL: 'mysql://localhost/db' }),
        'must be a postgresql:// connection string',
      );
    });

    it('reports every problem at once rather than one per run', () => {
      let message = '';
      try {
        loadAppConfig({ LLM_PROVIDER: 'openrouter', PORT: '70000' });
      } catch (error) {
        message = (error as Error).message;
      }

      expect(message).toContain('DATABASE_URL');
      expect(message).toContain('OPENROUTER_API_KEY');
      expect(message).toContain('PORT');
      expect(message).toContain('3 problems');
    });
  });

  describe('provider consistency', () => {
    it('requires GOOGLE_API_KEY when the text provider is gemini', () => {
      expectProblem(
        { DATABASE_URL: MINIMAL_ENV.DATABASE_URL },
        'aistudio.google.com/apikey',
      );
    });

    it('requires OPENROUTER_API_KEY when the text provider is openrouter', () => {
      expectProblem(
        envWith({ LLM_PROVIDER: 'openrouter', GOOGLE_API_KEY: undefined }),
        'OPENROUTER_API_KEY',
      );
    });

    it('selects the openrouter key and default model for that provider', () => {
      const config = loadAppConfig(
        envWith({
          LLM_PROVIDER: 'openrouter',
          OPENROUTER_API_KEY: 'test-openrouter-key',
        }),
      );

      expect(config.llm).toMatchObject({
        provider: 'openrouter',
        apiKey: 'test-openrouter-key',
        textModel: 'deepseek/deepseek-chat-v3:free',
      });
    });

    it('requires a key when embeddings are hosted but not when local', () => {
      expectProblem(
        envWith({
          EMBEDDING_PROVIDER: 'gemini',
          LLM_PROVIDER: 'openrouter',
          OPENROUTER_API_KEY: 'k',
          GOOGLE_API_KEY: undefined,
        }),
        'EMBEDDING_PROVIDER=gemini',
      );

      expect(
        loadAppConfig(envWith({ EMBEDDING_PROVIDER: 'local' })).embedding
          .apiKey,
      ).toBeNull();
    });

    it('requires a token when portraits come from huggingface', () => {
      expectProblem(
        envWith({ PORTRAIT_PROVIDER: 'huggingface' }),
        'HUGGINGFACE_API_KEY',
      );
    });

    it('needs both Langfuse keys or neither', () => {
      expectProblem(
        envWith({ LANGFUSE_PUBLIC_KEY: 'pk-only' }),
        'or neither (tracing is optional)',
      );

      const config = loadAppConfig(
        envWith({
          LANGFUSE_PUBLIC_KEY: 'pk-test',
          LANGFUSE_SECRET_KEY: 'sk-test',
        }),
      );

      expect(config.observability).toMatchObject({
        enabled: true,
        baseUrl: 'https://cloud.langfuse.com',
      });
    });
  });

  describe('empty-string handling', () => {
    // `KEY=` in a .env file yields '', which a plain z.string() would accept
    // and pass to the provider as a blank credential.
    it('treats a blank key as absent', () => {
      expectProblem(
        envWith({ GOOGLE_API_KEY: '   ' }),
        'is required when LLM_PROVIDER=gemini',
      );
    });

    it('falls back to the default model when the override is blank', () => {
      const config = loadAppConfig(envWith({ LLM_TEXT_MODEL: '' }));

      expect(config.llm.textModel).toBe('gemini-3.5-flash');
    });
  });

  describe('numeric coercion', () => {
    it('parses numeric strings from the environment', () => {
      const config = loadAppConfig(
        envWith({
          PORT: '4000',
          GENERATION_BATCH_SIZE: '2',
          GENERATION_BATCH_DELAY_MS: '0',
        }),
      );

      expect(config.port).toBe(4000);
      expect(config.generation.batchSize).toBe(2);
      // 0 is a legitimate value — no pause — and must survive the default.
      expect(config.generation.batchDelayMs).toBe(0);
    });

    it('accepts a fractional backoff factor', () => {
      const config = loadAppConfig(
        envWith({ GENERATION_BATCH_BACKOFF_FACTOR: '1.5' }),
      );

      expect(config.generation.batchBackoffFactor).toBe(1.5);
    });

    it('rejects a batch size beyond the supported range', () => {
      expectProblem(
        envWith({ GENERATION_BATCH_SIZE: '0' }),
        'GENERATION_BATCH_SIZE',
      );
    });

    it('rejects a corpus size beyond the supported range', () => {
      expectProblem(
        envWith({ CORPUS_DEFAULT_SIZE: '500' }),
        'CORPUS_DEFAULT_SIZE',
      );
    });

    it('rejects an embedding width above the pgvector HNSW ceiling', () => {
      expectProblem(
        envWith({ EMBEDDING_DIMENSIONS: '3072' }),
        'EMBEDDING_DIMENSIONS',
      );
    });
  });
});
