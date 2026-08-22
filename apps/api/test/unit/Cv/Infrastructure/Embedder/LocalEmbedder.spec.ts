import { EmbeddingFailedError } from '../../../../../src/Cv/Domain/EmbeddingFailedError';
import {
  LocalEmbedder,
  type FeatureExtractor,
} from '../../../../../src/Cv/Infrastructure/Embedder/LocalEmbedder';
import type { EmbeddingConfig } from '../../../../../src/Shared/Infrastructure/Config';
import { caughtRejection } from '../../../../support/caughtError';

const CONFIG: EmbeddingConfig = {
  provider: 'local',
  model: 'multilingual-e5-small',
  dimensions: 4,
  apiKey: null,
};

const vector = (length = 4): number[] => Array.from({ length }, () => 0.5);

// The real model is 120MB of ONNX and forty seconds of warm-up, so the loader is
// injected: what is worth testing here is the prefixing and the guards, not
// whether onnxruntime works.
const embedderOver = (
  extractor: FeatureExtractor,
  config: EmbeddingConfig = CONFIG,
): { embedder: LocalEmbedder; loads: number } => {
  const state = { loads: 0 };

  const embedder = new LocalEmbedder(config, '/tmp/storage', () => {
    state.loads += 1;
    return Promise.resolve(extractor);
  });

  return {
    embedder,
    get loads(): number {
      return state.loads;
    },
  };
};

describe('LocalEmbedder', () => {
  it('reports the configured width so ingestion can check it against the column', () => {
    const { embedder } = embedderOver(() =>
      Promise.resolve({ vectors: [vector()] }),
    );

    expect(embedder.dimensions).toBe(4);
  });

  it('prefixes documents with "passage: "', async () => {
    const seen: string[][] = [];
    const { embedder } = embedderOver((texts) => {
      seen.push(texts);
      return Promise.resolve({ vectors: texts.map(() => vector()) });
    });

    await embedder.embed(['Ana Ruiz — EXPERIENCE — ledger service', 'skills']);

    expect(seen[0]).toEqual([
      'passage: Ana Ruiz — EXPERIENCE — ledger service',
      'passage: skills',
    ]);
  });

  it('prefixes a search with "query: "', async () => {
    const seen: string[][] = [];
    const { embedder } = embedderOver((texts) => {
      seen.push(texts);
      return Promise.resolve({ vectors: [vector()] });
    });

    await embedder.embedQuery('who knows Python?');

    // E5 is trained asymmetrically; embedding a query as a passage costs real
    // recall, which is why the port has two methods at all.
    expect(seen[0]).toEqual(['query: who knows Python?']);
  });

  it('loads the model once and reuses it', async () => {
    const state = embedderOver((texts) =>
      Promise.resolve({ vectors: texts.map(() => vector()) }),
    );

    await state.embedder.embed(['one']);
    await state.embedder.embed(['two']);
    await state.embedder.embedQuery('three');

    expect(state.loads).toBe(1);
  });

  it('shares a single load between concurrent callers', async () => {
    const state = embedderOver((texts) =>
      Promise.resolve({ vectors: texts.map(() => vector()) }),
    );

    await Promise.all([
      state.embedder.embed(['one']),
      state.embedder.embed(['two']),
    ]);

    expect(state.loads).toBe(1);
  });

  it('never calls the model for an empty batch', async () => {
    const state = embedderOver(() =>
      Promise.reject(new Error('should not be called')),
    );

    await expect(state.embedder.embed([])).resolves.toEqual([]);
    expect(state.loads).toBe(0);
  });

  it('refuses a vector of the wrong width', async () => {
    const { embedder } = embedderOver(() =>
      Promise.resolve({ vectors: [vector(384)] }),
    );

    const error = await caughtRejection(() => embedder.embed(['text']));

    // Writing 384-wide vectors into a column sized for something else surfaces
    // weeks later as bad search results, not as an error.
    expect(error).toBeInstanceOf(EmbeddingFailedError);
    expect((error as Error).message).toContain('migration');
  });

  it('refuses a batch that came back the wrong size', async () => {
    const { embedder } = embedderOver(() =>
      Promise.resolve({ vectors: [vector()] }),
    );

    const error = await caughtRejection(() => embedder.embed(['a', 'b']));

    expect(error).toBeInstanceOf(EmbeddingFailedError);
    expect((error as Error).message).toContain('which chunk is which');
  });

  it('wraps a model failure in a domain error', async () => {
    const { embedder } = embedderOver(() =>
      Promise.reject(new Error('onnx session died')),
    );

    const error = await caughtRejection(() => embedder.embed(['text']));

    expect(error).toBeInstanceOf(EmbeddingFailedError);
    expect((error as Error).message).toContain('onnx session died');
  });
});
