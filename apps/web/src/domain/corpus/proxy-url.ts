/**
 * `CandidateSummaryDto.portraitUrl`/`pdfUrl` are API-relative paths (e.g.
 * `/cvs/ana-ruiz/portrait`), on purpose — the API has no idea it's behind a
 * proxy. This is the one place that turns one into a browser-usable path.
 */
export function toProxyUrl(apiRelativePath: string): string {
  return `/api/proxy${apiRelativePath}`;
}
