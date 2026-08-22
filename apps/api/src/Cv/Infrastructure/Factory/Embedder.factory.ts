import type { Provider } from '@nestjs/common';
import { LoggerId, type Logger } from '../../../Shared/Domain';
import {
  APP_CONFIG,
  type AppConfig,
} from '../../../Shared/Infrastructure/Config';
import { HttpTransport } from '../../../Shared/Infrastructure/Http';
import { EmbedderId, type Embedder } from '../../Domain/Embedder';
import { GeminiEmbedder } from '../Embedder/GeminiEmbedder';
import { LocalEmbedder } from '../Embedder/LocalEmbedder';

export const EmbedderFactory: Provider = {
  provide: EmbedderId,
  useFactory: (
    config: AppConfig,
    transport: HttpTransport,
    logger: Logger,
  ): Embedder => {
    if (config.embedding.provider === 'gemini') {
      // Non-null: the config module rejects provider=gemini without a key at
      // boot, so this cannot be reached unconfigured.
      return new GeminiEmbedder(
        config.embedding,
        config.embedding.apiKey as string,
        transport,
      );
    }

    return new LocalEmbedder(
      config.embedding,
      config.storageDir,
      undefined,
      logger,
    );
  },
  inject: [APP_CONFIG, HttpTransport, LoggerId],
};
