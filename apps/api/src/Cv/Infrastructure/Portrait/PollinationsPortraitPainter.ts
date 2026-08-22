import type { HttpTransport } from '../../../Shared/Infrastructure/Http';
import type { Persona } from '../../Domain/Persona';
import type {
  PortraitImage,
  PortraitPainter,
} from '../../Domain/PortraitPainter';
import { PortraitPaintingError } from '../../Domain/PortraitPaintingError';
import { buildPortraitPrompt, portraitSeed } from './buildPortraitPrompt';

export const POLLINATIONS_PROVIDER = 'pollinations';

const BASE_URL = 'https://image.pollinations.ai/prompt';

/**
 * Free and keyless, which makes it the default: nothing to sign up for, so the
 * quick start stays "add one LLM key".
 *
 * The trade is reliability — it is slow under load and occasionally answers with
 * an error page. Hence the generous timeout, the byte-level sanity check, and
 * the fallback chain behind it.
 */
export class PollinationsPortraitPainter implements PortraitPainter {
  constructor(
    private readonly transport: HttpTransport,
    private readonly model: string | null,
  ) {}

  async paint(persona: Persona): Promise<PortraitImage> {
    const parameters = new URLSearchParams({
      width: '512',
      height: '512',
      seed: String(portraitSeed(persona)),
      nologo: 'true',
      safe: 'true',
    });

    if (this.model !== null) {
      parameters.set('model', this.model);
    }

    const url = `${BASE_URL}/${encodeURIComponent(buildPortraitPrompt(persona))}?${parameters.toString()}`;

    let response;
    try {
      response = await this.transport.bytes({
        url,
        // Image generation on a free endpoint is slow; a 30s default would fail
        // most calls and fall through to the SVG for no reason.
        timeoutMs: 120_000,
        label: 'pollinations:image',
      });
    } catch (error: unknown) {
      throw PortraitPaintingError.forProvider(POLLINATIONS_PROVIDER, error);
    }

    // An HTML error page arrives as a 200 with a body. Anything this small is
    // not a 512×512 photograph.
    if (response.bytes.byteLength < 1_024) {
      throw PortraitPaintingError.forEmptyImage(POLLINATIONS_PROVIDER);
    }

    if (!response.mimeType.startsWith('image/')) {
      throw PortraitPaintingError.forProvider(
        POLLINATIONS_PROVIDER,
        new Error(`expected an image, got ${response.mimeType}`),
      );
    }

    return {
      bytes: response.bytes,
      mimeType: response.mimeType,
      provider: POLLINATIONS_PROVIDER,
    };
  }
}
