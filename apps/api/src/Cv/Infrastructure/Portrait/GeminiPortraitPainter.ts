import { z } from 'zod';
import type { HttpTransport } from '../../../Shared/Infrastructure/Http';
import type { Persona } from '../../Domain/Persona';
import type {
  PortraitImage,
  PortraitPainter,
} from '../../Domain/PortraitPainter';
import { PortraitPaintingError } from '../../Domain/PortraitPaintingError';
import { buildPortraitPrompt } from './buildPortraitPrompt';

export const GEMINI_PORTRAIT_PROVIDER = 'gemini';

const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';

const responseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z
              .array(
                z
                  .object({
                    inlineData: z.object({
                      mimeType: z.string(),
                      data: z.string(),
                    }),
                  })
                  .partial(),
              )
              .optional(),
          })
          .optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
});

/**
 * Photorealistic portraits from Google's image models, on the same free AI
 * Studio key the text drafter already uses.
 *
 * Added because the keyless option stopped being able to do this: Pollinations'
 * anonymous tier now serves a single model (SANA) that returns illustrations
 * whatever the prompt asks for. This needs no new account, which is why it is
 * preferred over Hugging Face when a Google key is present.
 *
 * Images come back as base64 inside the response rather than as a URL, so
 * nothing here needs a second request or a signed link.
 */
export class GeminiPortraitPainter implements PortraitPainter {
  constructor(
    private readonly transport: HttpTransport,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async paint(persona: Persona): Promise<PortraitImage> {
    let payload: unknown;

    try {
      payload = await this.transport.json({
        url: `${GEMINI_BASE_URL}/${this.model}:generateContent`,
        method: 'POST',
        headers: { 'x-goog-api-key': this.apiKey },
        body: {
          contents: [
            { role: 'user', parts: [{ text: buildPortraitPrompt(persona) }] },
          ],
          generationConfig: {
            // Without asking for IMAGE the model answers with a description of
            // the photograph it would have made.
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '1:1' },
          },
        },
        timeoutMs: 120_000,
        label: 'gemini:generateImage',
      });
    } catch (error: unknown) {
      throw PortraitPaintingError.forProvider(GEMINI_PORTRAIT_PROVIDER, error);
    }

    const parsed = responseSchema.safeParse(payload);

    if (!parsed.success) {
      throw PortraitPaintingError.forProvider(
        GEMINI_PORTRAIT_PROVIDER,
        new Error('the response did not contain an image part'),
      );
    }

    const image = parsed.data.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData !== undefined,
    )?.inlineData;

    if (image === undefined) {
      // Usually a safety refusal. The chain falls through to the SVG, so a
      // refused portrait costs a nice photo and never a CV.
      throw PortraitPaintingError.forEmptyImage(GEMINI_PORTRAIT_PROVIDER);
    }

    const bytes = new Uint8Array(Buffer.from(image.data, 'base64'));

    if (bytes.byteLength < 1_024) {
      throw PortraitPaintingError.forEmptyImage(GEMINI_PORTRAIT_PROVIDER);
    }

    return {
      bytes,
      mimeType: image.mimeType,
      provider: GEMINI_PORTRAIT_PROVIDER,
    };
  }
}
