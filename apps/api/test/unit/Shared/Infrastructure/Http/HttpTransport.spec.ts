import { HttpRequestFailedError } from '../../../../../src/Shared/Infrastructure/Http/HttpRequestFailedError';
import {
  HttpTransport,
  type Fetch,
} from '../../../../../src/Shared/Infrastructure/Http/HttpTransport';
import { RetryableError } from '../../../../../src/Shared/Infrastructure/Http/RetryableError';
import { caughtRejection } from '../../../../support/caughtError';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const transportOver = (
  responses: (Response | Error)[],
): {
  transport: HttpTransport;
  calls: { url: string; init?: RequestInit }[];
} => {
  const calls: { url: string; init?: RequestInit }[] = [];
  let index = 0;

  const fetchImpl = ((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const next = responses[Math.min(index, responses.length - 1)];
    index += 1;

    return next instanceof Error
      ? Promise.reject(next)
      : Promise.resolve(next.clone());
  }) as unknown as Fetch;

  return {
    calls,
    transport: new HttpTransport(fetchImpl, undefined, {
      sleep: () => Promise.resolve(),
      baseDelayMs: 1,
    }),
  };
};

describe('HttpTransport', () => {
  it('parses a JSON body', async () => {
    const { transport } = transportOver([jsonResponse({ ok: true })]);

    await expect(
      transport.json({ url: 'https://example.test/x' }),
    ).resolves.toEqual({
      ok: true,
    });
  });

  it('retries a 429 and returns the eventual success', async () => {
    const { transport, calls } = transportOver([
      new Response('slow down', { status: 429 }),
      jsonResponse({ ok: true }),
    ]);

    await expect(
      transport.json({ url: 'https://example.test/x' }),
    ).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });

  it('retries a 500', async () => {
    const { transport, calls } = transportOver([
      new Response('boom', { status: 502 }),
      jsonResponse({ ok: true }),
    ]);

    await transport.json({ url: 'https://example.test/x' });

    expect(calls).toHaveLength(2);
  });

  it('fails a 4xx immediately, because retrying a bad request is just quota', async () => {
    const { transport, calls } = transportOver([
      new Response('invalid api key', { status: 401 }),
    ]);

    const error = await caughtRejection(() =>
      transport.json({ url: 'https://example.test/x' }),
    );

    expect(error).toBeInstanceOf(HttpRequestFailedError);
    expect(calls).toHaveLength(1);
  });

  it('keeps the API key out of the error message', async () => {
    const { transport } = transportOver([
      new Response('nope', { status: 403 }),
    ]);

    const error = await caughtRejection(() =>
      transport.json({ url: 'https://example.test/v1?key=super-secret' }),
    );

    expect((error as Error).message).not.toContain('super-secret');
  });

  it('treats a dropped connection as retryable', async () => {
    const { transport, calls } = transportOver([
      new TypeError('fetch failed'),
      jsonResponse({ ok: true }),
    ]);

    await transport.json({ url: 'https://example.test/x' });

    expect(calls).toHaveLength(2);
  });

  it('treats a 200 with a truncated body as retryable rather than a contract error', async () => {
    const { transport } = transportOver([
      new Response('{"partial":', { status: 200 }),
    ]);

    const error = await caughtRejection(() =>
      transport.json({ url: 'https://example.test/x' }),
    );

    expect(error).toBeInstanceOf(RetryableError);
  });

  it('returns bytes with the served content type', async () => {
    const { transport } = transportOver([
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { 'content-type': 'image/png; charset=binary' },
      }),
    ]);

    const image = await transport.bytes({ url: 'https://example.test/i.png' });

    expect(image.bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(image.mimeType).toBe('image/png');
  });

  it('sends a JSON content type and the given method when there is a body', async () => {
    const { transport, calls } = transportOver([jsonResponse({})]);

    await transport.json({
      url: 'https://example.test/x',
      method: 'POST',
      headers: { authorization: 'Bearer t' },
      body: { question: 'who knows Python?' },
    });

    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.headers).toMatchObject({
      authorization: 'Bearer t',
      'content-type': 'application/json',
    });
    expect(calls[0].init?.body).toBe('{"question":"who knows Python?"}');
  });
});
