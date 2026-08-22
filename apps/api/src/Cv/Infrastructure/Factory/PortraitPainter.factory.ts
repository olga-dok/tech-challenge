import type { Provider } from '@nestjs/common';
import { LoggerId, type Logger } from '../../../Shared/Domain';
import {
  APP_CONFIG,
  type AppConfig,
} from '../../../Shared/Infrastructure/Config';
import { HttpTransport } from '../../../Shared/Infrastructure/Http';
import {
  PortraitPainterId,
  type PortraitPainter,
} from '../../Domain/PortraitPainter';
import { FallbackPortraitPainter } from '../Portrait/FallbackPortraitPainter';
import { HuggingFacePortraitPainter } from '../Portrait/HuggingFacePortraitPainter';
import { PollinationsPortraitPainter } from '../Portrait/PollinationsPortraitPainter';
import { SvgAvatarPainter } from '../Portrait/SvgAvatarPainter';

/**
 * Builds the chain: whichever provider is configured, then the local SVG.
 *
 * The SVG is always last and always present. That is the whole reliability
 * story for portraits — every remote link in the chain is allowed to fail.
 */
export const PortraitPainterFactory: Provider = {
  provide: PortraitPainterId,
  useFactory: (
    config: AppConfig,
    transport: HttpTransport,
    logger: Logger,
  ): PortraitPainter => {
    const svg = new SvgAvatarPainter();

    if (config.portrait.provider === 'svg') {
      return svg;
    }

    const remote =
      config.portrait.provider === 'huggingface'
        ? new HuggingFacePortraitPainter(
            transport,
            // Non-null: the config module refuses provider=huggingface without
            // a token at boot.
            config.portrait.apiKey as string,
            config.portrait.model ?? 'black-forest-labs/FLUX.1-schnell',
            logger,
          )
        : new PollinationsPortraitPainter(transport, config.portrait.model);

    return new FallbackPortraitPainter([remote, svg], logger);
  },
  inject: [APP_CONFIG, HttpTransport, LoggerId],
};
