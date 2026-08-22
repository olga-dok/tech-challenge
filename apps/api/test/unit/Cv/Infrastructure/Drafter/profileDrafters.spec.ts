import { ProfileDraftingError } from '../../../../../src/Cv/Domain/ProfileDraftingError';
import { GeminiProfileDrafter } from '../../../../../src/Cv/Infrastructure/Drafter/GeminiProfileDrafter';
import { OpenRouterProfileDrafter } from '../../../../../src/Cv/Infrastructure/Drafter/OpenRouterProfileDrafter';
import type { LlmConfig } from '../../../../../src/Shared/Infrastructure/Config';
import {
  HttpTransport,
  type Fetch,
} from '../../../../../src/Shared/Infrastructure/Http';
import { caughtRejection } from '../../../../support/caughtError';
import { personaFixture, profileFixture } from '../../../../support/fixtures';

interface Recorded {
  readonly url: string;
  readonly init?: RequestInit;
}

const transportOver = (
  bodies: unknown[],
): { transport: HttpTransport; calls: Recorded[] } => {
  const calls: Recorded[] = [];
  let index = 0;

  const fetchImpl = ((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const body = bodies[Math.min(index, bodies.length - 1)];
    index += 1;

    return Promise.resolve(
      new Response(JSON.stringify(body), {
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

const geminiSaying = (text: string): unknown => ({
  candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
});

const openRouterSaying = (content: string): unknown => ({
  choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
});

const parseBody = (init?: RequestInit): Record<string, unknown> => {
  const body = init?.body;

  if (typeof body !== 'string') {
    throw new TypeError('Expected a serialised JSON body');
  }

  return JSON.parse(body) as Record<string, unknown>;
};

const GEMINI_CONFIG: LlmConfig = {
  provider: 'gemini',
  apiKey: 'test-google-key',
  textModel: 'gemini-3.5-flash',
};

const OPENROUTER_CONFIG: LlmConfig = {
  provider: 'openrouter',
  apiKey: 'test-openrouter-key',
  textModel: 'deepseek/deepseek-chat-v3:free',
};

describe('GeminiProfileDrafter', () => {
  const persona = personaFixture();

  it('drafts a profile from a structured-output response', async () => {
    const { transport } = transportOver([
      geminiSaying(JSON.stringify(profileFixture())),
    ]);

    await expect(
      new GeminiProfileDrafter(GEMINI_CONFIG, transport).draft(persona),
    ).resolves.toEqual(profileFixture());
  });

  it('asks for JSON against a schema derived from the contract', async () => {
    const { transport, calls } = transportOver([
      geminiSaying(JSON.stringify(profileFixture())),
    ]);

    await new GeminiProfileDrafter(GEMINI_CONFIG, transport).draft(persona);
    const body = parseBody(calls[0].init);
    const generationConfig = body['generationConfig'] as Record<
      string,
      unknown
    >;
    const schema = generationConfig['responseSchema'] as Record<
      string,
      unknown
    >;

    expect(calls[0].url).toContain('gemini-3.5-flash:generateContent');
    expect(generationConfig['responseMimeType']).toBe('application/json');
    expect(Object.keys(schema['properties'] as object)).toContain('experience');
  });

  it('sends the key as a header, never in the URL', async () => {
    const { transport, calls } = transportOver([
      geminiSaying(JSON.stringify(profileFixture())),
    ]);

    await new GeminiProfileDrafter(GEMINI_CONFIG, transport).draft(persona);

    // Transport errors quote the URL; a key in the query string would end up in
    // logs and error messages.
    expect(calls[0].url).not.toContain('test-google-key');
    expect(calls[0].init?.headers).toMatchObject({
      'x-goog-api-key': 'test-google-key',
    });
  });

  it('reports a blocked or truncated completion instead of retrying it', async () => {
    const { transport, calls } = transportOver([
      { candidates: [{ finishReason: 'SAFETY' }] },
    ]);

    const error = await caughtRejection(() =>
      new GeminiProfileDrafter(GEMINI_CONFIG, transport).draft(persona),
    );

    expect(error).toBeInstanceOf(ProfileDraftingError);
    expect((error as Error).message).toContain('SAFETY');
    expect(calls).toHaveLength(1);
  });

  it('wraps a transport failure as a drafting failure for this candidate', async () => {
    const fetchImpl = (() =>
      Promise.resolve(
        new Response('nope', { status: 403 }),
      )) as unknown as Fetch;

    const error = await caughtRejection(() =>
      new GeminiProfileDrafter(
        GEMINI_CONFIG,
        new HttpTransport(fetchImpl, undefined, {
          sleep: () => Promise.resolve(),
        }),
      ).draft(persona),
    );

    expect(error).toBeInstanceOf(ProfileDraftingError);
    expect((error as ProfileDraftingError).candidate).toBe('Ana Ruiz');
  });
});

describe('OpenRouterProfileDrafter', () => {
  const persona = personaFixture();

  it('drafts a profile from a chat completion', async () => {
    const { transport } = transportOver([
      openRouterSaying(JSON.stringify(profileFixture())),
    ]);

    await expect(
      new OpenRouterProfileDrafter(OPENROUTER_CONFIG, transport).draft(persona),
    ).resolves.toEqual(profileFixture());
  });

  it('copes with a free model that ignores response_format and fences its answer', async () => {
    const { transport } = transportOver([
      openRouterSaying(
        `Sure, here it is:\n\`\`\`json\n${JSON.stringify(profileFixture())}\n\`\`\``,
      ),
    ]);

    await expect(
      new OpenRouterProfileDrafter(OPENROUTER_CONFIG, transport).draft(persona),
    ).resolves.toEqual(profileFixture());
  });

  it('still asks for JSON and identifies itself for free-tier attribution', async () => {
    const { transport, calls } = transportOver([
      openRouterSaying(JSON.stringify(profileFixture())),
    ]);

    await new OpenRouterProfileDrafter(OPENROUTER_CONFIG, transport).draft(
      persona,
    );
    const body = parseBody(calls[0].init);

    expect(body['model']).toBe('deepseek/deepseek-chat-v3:free');
    expect(body['response_format']).toEqual({ type: 'json_object' });
    expect(calls[0].init?.headers).toMatchObject({
      authorization: 'Bearer test-openrouter-key',
      'x-title': 'CV Screener',
    });
  });

  it('surfaces the provider error message when the completion is empty', async () => {
    const { transport } = transportOver([
      {
        choices: [{ message: { content: '' } }],
        error: { message: 'rate limited' },
      },
    ]);

    const error = await caughtRejection(() =>
      new OpenRouterProfileDrafter(OPENROUTER_CONFIG, transport).draft(persona),
    );

    expect(error).toBeInstanceOf(ProfileDraftingError);
    expect((error as Error).message).toContain('rate limited');
  });
});
