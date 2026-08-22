import { BaseError } from '../../Domain';

/** A failure no amount of retrying fixes: a bad key, a bad request, a 404. */
export class HttpRequestFailedError extends BaseError {
  private constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
  }

  static fromResponse(
    url: string,
    status: number,
    body: string,
  ): HttpRequestFailedError {
    // The URL is truncated and the body capped: provider URLs carry API keys as
    // query parameters, and an error message is not a place for a secret or for
    // a megabyte of HTML.
    const endpoint = url.split('?')[0];

    return new HttpRequestFailedError(
      `${endpoint} responded ${String(status)}: ${body.slice(0, 300)}`,
      status,
      body,
    );
  }
}
