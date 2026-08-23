import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PdfParseTextExtractor } from '../../../../../src/Cv/Infrastructure/Extraction/PdfParseTextExtractor';
import { buildMinimalPdf } from '../../../../support/buildMinimalPdf';

describe('PdfParseTextExtractor', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'pdf-extractor-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const writePdf = async (name: string, bytes: Buffer): Promise<string> => {
    const path = join(dir, name);
    await writeFile(path, bytes);

    return path;
  };

  it('extracts pages and raw text from a real PDF', async () => {
    const extractor = new PdfParseTextExtractor();
    const path = await writePdf('cv.pdf', buildMinimalPdf('Hello World'));

    const result = await extractor.extract(path);

    expect(result.succeeded).toBe(true);
    if (result.succeeded) {
      expect(result.document.rawText).toContain('Hello World');
      expect(result.document.pages).toHaveLength(1);
    }
  });

  it('reports non-pdf for a file without the PDF magic bytes', async () => {
    const extractor = new PdfParseTextExtractor();
    const path = await writePdf('cv.pdf', Buffer.from('not a pdf file'));

    const result = await extractor.extract(path);

    expect(result.succeeded).toBe(false);
    if (!result.succeeded) {
      expect(result.failure.reason).toBe('non-pdf');
    }
  });

  it('reports oversize for a file over the configured cap', async () => {
    const extractor = new PdfParseTextExtractor(16);
    const path = await writePdf('cv.pdf', buildMinimalPdf('Hello World'));

    const result = await extractor.extract(path);

    expect(result.succeeded).toBe(false);
    if (!result.succeeded) {
      expect(result.failure.reason).toBe('oversize');
    }
  });

  it('reports empty-text for a PDF with no extractable text', async () => {
    const extractor = new PdfParseTextExtractor();
    const path = await writePdf('cv.pdf', buildMinimalPdf(''));

    const result = await extractor.extract(path);

    expect(result.succeeded).toBe(false);
    if (!result.succeeded) {
      expect(result.failure.reason).toBe('empty-text');
    }
  });

  it('reports parse-failed for a corrupt PDF instead of throwing', async () => {
    const extractor = new PdfParseTextExtractor();
    const path = await writePdf(
      'cv.pdf',
      Buffer.from('%PDF-1.4\nthis is not a real pdf body'),
    );

    const result = await extractor.extract(path);

    expect(result.succeeded).toBe(false);
    if (!result.succeeded) {
      expect(result.failure.reason).toBe('parse-failed');
    }
  });
});
