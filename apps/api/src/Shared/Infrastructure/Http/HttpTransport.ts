import type { Logger } from '../../Domain';
import { HttpRequestFailedError } from './HttpRequestFailedError';
import { RetryableError } from './RetryableError';
import { parseRetryAfter, withRetry, type RetryOptions } from './withRetry';

export interface HttpRequest {
  readonly url: string;
  readonly method?: 'GET' | 'POST';
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
  readonly timeoutMs?: number;
  /** Overrides for this call — image endpoints deserve more patience than JSON ones. */
  readonly retry?: RetryOptions;
  readonly label?: string;
}

export interface BinaryResponse {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}

export type Fetch = typeof globalThis.fetch;

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * The single door out of this process, so every network adapter gets the same
 * treatment: a timeout, retries with backoff on the failures worth retrying,
 * and a typed error otherwise.
 *
 * The status split is the important part. 429 and 5xx are the free tier being
 * busy — retry. Everything else is us being wrong — fail now and say why,
 * rather than asking four times and reporting the last answer.
 */
export class HttpTransport {
  constructor(
    private readonly fetchImpl: Fetch = globalThis.fetch,
    private readonly logger?: Logger,
    private readonly defaults: RetryOptions = {},
  ) {}

  async json(request: HttpRequest): Promise<unknown> {
    const response = await this.send(request);
    const text = await response.text();

    try {
      return JSON.parse(text) as unknown;
    } catch {
      // A provider that answers 200 with a truncated body is a transport
      // problem, not a contract problem — worth another attempt next time.
      throw RetryableError.fromStatus(
        response.status,
        `response was not JSON: ${text.slice(0, 200)}`,
      );
    }
  }

  async bytes(request: HttpRequest): Promise<BinaryResponse> {
    const response = await this.send(request);
    const buffer = await response.arrayBuffer();

    return {
      bytes: new Uint8Array(buffer),
      mimeType:
        response.headers.get('content-type')?.split(';')[0] ??
        'application/octet-stream',
    };
  }

  /**
   * The raw body stream, for a provider's own streaming endpoint. Reuses
   * `send()` as-is — the retryable connect-and-status-check applies the same
   * way; what happens to a stream that fails *mid*-stream is the caller's
   * concern, since by then bytes may already have reached the client.
   */
  async stream(request: HttpRequest): Promise<ReadableStream<Uint8Array>> {
    const response = await this.send(request);

    if (!response.body) {
      throw HttpRequestFailedError.fromResponse(
        request.url,
        response.status,
        'response had no body to stream',
      );
    }

    return response.body;
  }

  private send(request: HttpRequest): Promise<Response> {
    const retry = { ...this.defaults, ...request.retry };

    return withRetry(
      async () => {
        const response = await this.attempt(request);

        if (response.ok) {
          return response;
        }

        const body = await response.text();

        if (response.status === 429 || response.status >= 500) {
          throw RetryableError.fromStatus(
            response.status,
            body.slice(0, 200),
            parseRetryAfter(response.headers.get('retry-after')),
          );
        }

        throw HttpRequestFailedError.fromResponse(
          request.url,
          response.status,
          body,
        );
      },
      {
        ...retry,
        logger: retry.logger ?? this.logger,
        label: request.label ?? request.url.split('?')[0],
      },
    );
  }

  private async attempt(request: HttpRequest): Promise<Response> {
    const headers = { ...request.headers };
    if (request.body !== undefined) {
      headers['content-type'] ??= 'application/json';
    }

    try {
      return await this.fetchImpl(request.url, {
        method: request.method ?? (request.body === undefined ? 'GET' : 'POST'),
        headers,
        body:
          request.body === undefined ? undefined : JSON.stringify(request.body),
        // A free image endpoint that hangs must not hang the whole run.
        signal: AbortSignal.timeout(request.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
    } catch (error: unknown) {
      // DNS failures, resets and timeouts are all worth another go.
      throw RetryableError.fromTransport(error);
    }
  }
}
