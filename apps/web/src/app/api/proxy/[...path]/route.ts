import type { NextRequest } from "next/server";

// Streaming (SSE, PDF, portrait) responses must reach the browser byte for
// byte, unbuffered — the edge runtime and any static optimization would get
// in the way of that.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = { params: Promise<{ path: string[] }> };

/**
 * Forwards everything to the real API so the browser never needs CORS or the
 * API's origin — from the browser's perspective this *is* the API. Copies
 * method, content-type, body, and the upstream response's status/headers
 * unchanged, so SSE's `content-type: text/event-stream` and
 * `cache-control: no-transform`, and a portrait/PDF's binary content-type,
 * all pass through exactly as the API sent them.
 */
async function forward(
  request: NextRequest,
  path: string[],
): Promise<Response> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const target = `${apiBaseUrl}/${path.join("/")}${request.nextUrl.search}`;

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const response = await fetch(target, {
    method: request.method,
    headers: hasBody
      ? {
          "content-type":
            request.headers.get("content-type") ?? "application/json",
        }
      : undefined,
    body: hasBody ? await request.text() : undefined,
    // Required by undici when a request carries a body that might stream.
    // @ts-expect-error -- `duplex` is missing from the DOM RequestInit type Node's fetch actually needs it.
    duplex: hasBody ? "half" : undefined,
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<Response> {
  return forward(request, (await params).path);
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<Response> {
  return forward(request, (await params).path);
}
