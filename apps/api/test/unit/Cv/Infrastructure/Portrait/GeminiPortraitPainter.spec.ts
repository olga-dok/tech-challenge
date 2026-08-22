import { PortraitPaintingError } from '../../../../../src/Cv/Domain/PortraitPaintingError';
import { buildPortraitPrompt } from '../../../../../src/Cv/Infrastructure/Portrait/buildPortraitPrompt';
import { GeminiPortraitPainter } from '../../../../../src/Cv/Infrastructure/Portrait/GeminiPortraitPainter';
import {
  HttpTransport,
  type Fetch,
} from '../../../../../src/Shared/Infrastructure/Http';
import { caughtRejection } from '../../../../support/caughtError';
import { personaFixture } from '../../../../support/fixtures';

const imageBase64 = Buffer.from(new Uint8Array(2_048).fill(7)).toString(
  'base64',
);

const transportOver = (
  body: unknown,
  status = 200,
): {
  transport: HttpTransport;
  calls: { url: string; init?: RequestInit }[];
} => {
  const calls: { url: string; init?: RequestInit }[] = [];

  const fetchImpl = ((url: string, init?: RequestInit) => {
    calls.push({ url, init });

    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  }) as unknown as Fetch;

  return {
    calls,
    transport: new HttpTransport(fetchImpl, undefined, {
      sleep: () => Promise.resolve(),
    }),
  };
};

const painterOver = (transport: HttpTransport): GeminiPortraitPainter =>
  new GeminiPortraitPainter(transport, 'test-key', 'gemini-3.1-flash-image');

describe('GeminiPortraitPainter', () => {
  const persona = personaFixture({ givenName: 'Hugo', gender: 'male' });

  it('decodes the inline image the model returns', async () => {
    const { transport } = transportOver({
      candidates: [
        {
          content: {
            parts: [
              { inlineData: { mimeType: 'image/png', data: imageBase64 } },
            ],
          },
        },
      ],
    });

    const portrait = await painterOver(transport).paint(persona);

    expect(portrait.provider).toBe('gemini');
    expect(portrait.mimeType).toBe('image/png');
    expect(portrait.bytes.byteLength).toBe(2_048);
  });

  it('asks for an image, not a description of one', async () => {
    const { transport, calls } = transportOver({
      candidates: [
        {
          content: {
            parts: [
              { inlineData: { mimeType: 'image/png', data: imageBase64 } },
            ],
          },
        },
      ],
    });

    await painterOver(transport).paint(persona);
    const raw = calls[0].init?.body;

    if (typeof raw !== 'string') {
      throw new TypeError('Expected a serialised JSON body');
    }

    const body = JSON.parse(raw) as {
      generationConfig: { responseModalities: string[] };
      contents: { parts: { text: string }[] }[];
    };

    expect(body.generationConfig.responseModalities).toEqual(['IMAGE']);
    // The prompt has to carry the gender, or the photo contradicts the CV.
    expect(body.contents[0].parts[0].text).toBe(buildPortraitPrompt(persona));
    expect(body.contents[0].parts[0].text).toContain('man');
    expect(body.contents[0].parts[0].text).toContain('photorealistic');
  });

  it('sends the key as a header, never in the URL', async () => {
    const { transport, calls } = transportOver({
      candidates: [
        {
          content: {
            parts: [
              { inlineData: { mimeType: 'image/png', data: imageBase64 } },
            ],
          },
        },
      ],
    });

    await painterOver(transport).paint(persona);

    expect(calls[0].url).not.toContain('test-key');
    expect(calls[0].init?.headers).toMatchObject({
      'x-goog-api-key': 'test-key',
    });
  });

  it('reports a text-only answer as a failure so the chain falls through', async () => {
    const { transport } = transportOver({
      candidates: [
        {
          content: { parts: [{ text: 'I cannot generate that image.' }] },
          finishReason: 'SAFETY',
        },
      ],
    });

    const error = await caughtRejection(() =>
      painterOver(transport).paint(persona),
    );

    // A refused portrait must cost a photograph, never a CV.
    expect(error).toBeInstanceOf(PortraitPaintingError);
  });

  it('rejects an image too small to be a portrait', async () => {
    const { transport } = transportOver({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: Buffer.from([1, 2, 3]).toString('base64'),
                },
              },
            ],
          },
        },
      ],
    });

    expect(
      await caughtRejection(() => painterOver(transport).paint(persona)),
    ).toBeInstanceOf(PortraitPaintingError);
  });

  it('wraps a quota refusal so the pipeline can pace itself', async () => {
    const { transport } = transportOver(
      { error: { code: 429, message: 'quota exceeded' } },
      429,
    );

    const error = await caughtRejection(() =>
      painterOver(transport).paint(persona),
    );

    expect(error).toBeInstanceOf(PortraitPaintingError);
  });
});
