/**
 * Print CSS the three templates share.
 *
 * The rules that matter for this project rather than for looks:
 *   * `@page A4` with explicit margins — a browser default page size would give
 *     US Letter and a subtly wrong document.
 *   * `page-break-inside: avoid` on every entry, so a job is never split across
 *     pages. A split entry becomes a chunk that starts mid-sentence.
 *   * a web-safe font stack, because the renderer must not depend on a font
 *     being installed on whatever machine runs the demo.
 *   * no `-webkit-text-fill-color` tricks or text-in-image anywhere: the
 *     extractor has to read every word back out, so all text is real text.
 *   * NO positive `letter-spacing`, however good uppercase headings look with
 *     it. Chromium emits a tracked run glyph by glyph, and the extractor then
 *     reads "H A B I L I D A D E S" — which the chunker's section patterns and
 *     the lexical search arm both miss. Verified by round-tripping the preview
 *     PDFs through pdf-parse.
 */
export const PAGE_STYLES = `
  @page { size: A4; margin: 14mm 14mm 16mm; }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    font-family: Helvetica, Arial, "Liberation Sans", sans-serif;
    font-size: 10.5pt;
    line-height: 1.42;
    color: #1f2933;
    -webkit-print-color-adjust: exact;
  }

  h1, h2, h3, h4 { margin: 0; font-weight: 600; }

  ul { margin: 4pt 0 0; padding-left: 14pt; }
  li { margin-bottom: 2.5pt; }

  a { color: inherit; text-decoration: none; }

  .entry, .education-entry, .cert { page-break-inside: avoid; break-inside: avoid; }
  .section { page-break-inside: auto; }
  .section-title {
    page-break-after: avoid;
    break-after: avoid;
  }

  .muted { color: #5c6b7a; }
  .tiny { font-size: 8.8pt; }

  .chips { display: flex; flex-wrap: wrap; gap: 3pt; margin-top: 4pt; }
  .chip {
    border: 0.6pt solid #c9d3dd;
    border-radius: 8pt;
    padding: 1.4pt 5pt;
    font-size: 8.8pt;
  }

  .portrait {
    object-fit: cover;
    border-radius: 3pt;
    background: #eef2f6;
  }
`;

export const documentShell = (
  title: string,
  styles: string,
  body: string,
): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>${PAGE_STYLES}${styles}</style>
</head>
<body>${body}</body>
</html>`;
