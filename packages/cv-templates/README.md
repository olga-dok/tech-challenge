# @repo/cv-templates

The CV document, as HTML. Framework-free on purpose: `renderCvHtml()` takes a
`CandidateProfile` and returns a complete self-contained document, which the API
feeds to Puppeteer to make a PDF and the web app drops into an `iframe srcdoc`
to preview in the browser.

Two consumers, one definition — that is the whole reason this is a package and
not a folder inside `apps/api`.

## Print rules that are not negotiable

The PDFs this produces are read back by the ingestion pipeline, so the document
has constraints a normal web page does not:

- **All text is real text.** Nothing baked into an image, no CSS tricks that
  render glyphs the extractor cannot recover.
- **No positive `letter-spacing`.** Chromium emits a tracked run glyph by glyph,
  so `pdf-parse` reads `H A B I L I D A D E S` and the chunker's section
  patterns miss it. Verified by round-tripping the preview PDFs.
- **Section headings match the CV's language.** The chunker detects
  `Experiencia` as well as `Experience`; a Spanish CV under English headings is
  mis-sectioned at ingestion and wrongly cited afterwards.
- **`page-break-inside: avoid` on every entry**, so a job never splits across
  pages and becomes a chunk starting mid-sentence.
- **Backgrounds must print.** The `header-band` template is white text on a dark
  band; rendered without `printBackground` it comes out blank.

## Portraits

`renderCvHtml` takes a `portraitUrl` string rather than bytes, so it stays
platform-neutral: the API passes a `data:` URI it builds from the painted image,
and the web app passes the portrait endpoint's URL.
