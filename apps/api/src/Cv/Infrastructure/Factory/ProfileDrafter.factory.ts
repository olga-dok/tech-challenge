import type { Provider } from '@nestjs/common';
import { LoggerId, type Logger } from '../../../Shared/Domain';
import {
  APP_CONFIG,
  type AppConfig,
} from '../../../Shared/Infrastructure/Config';
import { HttpTransport } from '../../../Shared/Infrastructure/Http';
import {
  ProfileDrafterId,
  type ProfileDrafter,
} from '../../Domain/ProfileDrafter';
import { GeminiProfileDrafter } from '../Drafter/GeminiProfileDrafter';
import { OpenRouterProfileDrafter } from '../Drafter/OpenRouterProfileDrafter';

/**
 * Provider choice is resolved here and nowhere else. Use cases receive a
 * `ProfileDrafter` and cannot tell which one they got, which is what makes
 * swapping a rate-limited provider a config change.
 */
export const ProfileDrafterFactory: Provider = {
  provide: ProfileDrafterId,
  useFactory: (
    config: AppConfig,
    transport: HttpTransport,
    logger: Logger,
  ): ProfileDrafter =>
    config.llm.provider === 'gemini'
      ? new GeminiProfileDrafter(config.llm, transport, logger)
      : new OpenRouterProfileDrafter(config.llm, transport, logger),
  inject: [APP_CONFIG, HttpTransport, LoggerId],
};
