import type { Provider } from '@nestjs/common';
import { LoggerId, type Logger } from '../../../Shared/Domain';
import {
  APP_CONFIG,
  type AppConfig,
} from '../../../Shared/Infrastructure/Config';
import { HttpTransport } from '../../../Shared/Infrastructure/Http';
import {
  GroundedAnswererId,
  type GroundedAnswerer,
} from '../../Domain/GroundedAnswerer';
import { GeminiGroundedAnswerer } from '../Answerer/GeminiGroundedAnswerer';
import { OpenRouterGroundedAnswerer } from '../Answerer/OpenRouterGroundedAnswerer';

/**
 * Same provider-selection shape as `ProfileDrafterFactory`: resolved once,
 * here and nowhere else, so swapping providers is a config change.
 */
export const AnswererFactory: Provider = {
  provide: GroundedAnswererId,
  useFactory: (
    config: AppConfig,
    transport: HttpTransport,
    logger: Logger,
  ): GroundedAnswerer =>
    config.llm.provider === 'gemini'
      ? new GeminiGroundedAnswerer(config.llm, transport, logger)
      : new OpenRouterGroundedAnswerer(config.llm, transport, logger),
  inject: [APP_CONFIG, HttpTransport, LoggerId],
};
