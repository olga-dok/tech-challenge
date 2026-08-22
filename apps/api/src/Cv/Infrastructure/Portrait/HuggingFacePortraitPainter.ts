import type { Logger } from '../../../Shared/Domain';
import {
  RetryableError,
  type HttpTransport,
} from '../../../Shared/Infrastructure/Http';
import type { Persona } from '../../Domain/Persona';
import type {
  PortraitImage,
  PortraitPainter,
} from '../../Domain/PortraitPainter';
import { PortraitPaintingError } from '../../Domain/PortraitPaintingError';
import { buildPortraitPrompt, portraitSeed } from './buildPortraitPrompt';

export const HUGGINGFACE_PROVIDER = 'huggingface';

const BASE_URL = 'https://api-inference.huggingface.co/models';

/**
 * The free Inference API, as the alternative when Pollinations is having a bad
 * day. Needs a token, which is why it is not the default.
 *
 * Its distinctive behaviour is a cold start: the first request for an unloaded
 * model answers 503 with an estimated load time. `x-wait-for-model` asks the
 * service to hold the connection instead, and a 503 that slips through is
 * translated into a retryable error so the shared backoff handles it rather than
 * this class growing its own sleep loop.
 */
export class HuggingFacePortraitPainter implements PortraitPainter {
  private readonly logger?: Logger;

  constructor(
    private readonly transport: HttpTransport,
    private readonly apiKey: string,
    private readonly model: string,
    logger?: Logger,
  ) {
    this.logger = logger?.forContext('HuggingFacePortraitPainter');
  }

  async paint(persona: Persona): Promise<PortraitImage> {
    let response;

    try {
      response = await this.transport.bytes({
        url: `${BASE_URL}/${this.model}`,
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          // Wait for a cold model rather than being told to come back.
          'x-wait-for-model': 'true',
          accept: 'image/png',
        },
        body: {
          inputs: buildPortraitPrompt(persona),
          parameters: { width: 512, height: 512, seed: portraitSeed(persona) },
        },
        timeoutMs: 120_000,
        label: 'huggingface:inference',
      });
    } catch (error: unknown) {
      if (error instanceof RetryableError && error.status === 503) {
        this.logger?.warn('The image model was still loading', {
          model: this.model,
        });
      }

      throw PortraitPaintingError.forProvider(HUGGINGFACE_PROVIDER, error);
    }

    if (response.bytes.byteLength < 1_024) {
      throw PortraitPaintingError.forEmptyImage(HUGGINGFACE_PROVIDER);
    }

    if (!response.mimeType.startsWith('image/')) {
      // A JSON body here is the service explaining itself — usually a quota
      // message, which is exactly when the fallback should take over.
      throw PortraitPaintingError.forProvider(
        HUGGINGFACE_PROVIDER,
        new Error(`expected an image, got ${response.mimeType}`),
      );
    }

    return {
      bytes: response.bytes,
      mimeType: response.mimeType,
      provider: HUGGINGFACE_PROVIDER,
    };
  }
}
