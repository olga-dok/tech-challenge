import type { Response } from 'express';
import type { Observable } from 'rxjs';
import type { Logger } from '../../Domain';

/**
 * Pipes an event stream to the client as Server-Sent Events.
 *
 * Written against the raw response rather than Nest's `@Sse()` decorator for two
 * reasons: both streams here emit a discriminated union that the frontend parses
 * itself (so the decorator's `MessageEvent` wrapper is in the way), and the
 * headers below matter. `X-Accel-Buffering: no` and an immediate `flushHeaders`
 * are what stop a proxy — or Node itself — from holding the first events until
 * enough bytes accumulate, which looks exactly like a hung request during the
 * minute before the first CV lands.
 *
 * Unsubscribes when the client disconnects, so closing a browser tab stops a
 * generation run rather than leaving it writing into a dead socket.
 */
export function pipeEventStream<TEvent>(
  response: Response,
  stream: Observable<TEvent>,
  logger?: Logger,
): void {
  response.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  response.flushHeaders();

  const subscription = stream.subscribe({
    next: (event) => {
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    },
    error: (error: unknown) => {
      // The stream should have turned its own failures into an `error` event; if
      // one escapes anyway, the client still gets told rather than hanging.
      logger?.error('An event stream failed', {
        detail: error instanceof Error ? error.message : String(error),
      });
      response.write(
        `data: ${JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : String(error),
        })}\n\n`,
      );
      response.end();
    },
    complete: () => {
      response.end();
    },
  });

  response.on('close', () => {
    subscription.unsubscribe();
  });
}
