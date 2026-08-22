import type { Browser } from 'puppeteer';
import { PdfRenderingError } from '../../../../src/Cv/Domain/PdfRenderingError';
import { PuppeteerPdfRenderer } from '../../../../src/Cv/Infrastructure/PuppeteerPdfRenderer';
import { caughtRejection } from '../../../support/caughtError';
import { sampleProfile } from '@repo/cv-templates';

interface Journal {
  readonly launches: number;
  readonly pagesOpened: number;
  readonly pagesClosed: number;
  readonly pdfOptions: Record<string, unknown>[];
  readonly html: string[];
  readonly closed: number;
}

// A stub rather than a real Chromium: what is worth asserting here is the
// lifecycle — one browser per run, every page closed — and a real browser makes
// that a five-second test.
const fakeBrowser = (
  options: { failPdf?: boolean } = {},
): { browser: Browser; journal: Journal } => {
  const journal = {
    launches: 0,
    pagesOpened: 0,
    pagesClosed: 0,
    pdfOptions: [] as Record<string, unknown>[],
    html: [] as string[],
    closed: 0,
  };

  const browser = {
    newPage: () => {
      journal.pagesOpened += 1;

      return Promise.resolve({
        setContent: (html: string) => {
          journal.html.push(html);

          return Promise.resolve();
        },
        pdf: (pdfOptions: Record<string, unknown>) => {
          journal.pdfOptions.push(pdfOptions);

          return options.failPdf === true
            ? Promise.reject(new Error('chromium crashed'))
            : Promise.resolve(new Uint8Array([37, 80, 68, 70]));
        },
        close: () => {
          journal.pagesClosed += 1;

          return Promise.resolve();
        },
      });
    },
    close: () => {
      journal.closed += 1;

      return Promise.resolve();
    },
  } as unknown as Browser;

  return { browser, journal };
};

const request = {
  profile: sampleProfile(),
  portrait: {
    bytes: new Uint8Array([1, 2, 3]),
    mimeType: 'image/jpeg',
    provider: 'pollinations',
  },
  templateId: 'classic' as const,
  language: 'es' as const,
};

describe('PuppeteerPdfRenderer', () => {
  it('renders a PDF', async () => {
    const { browser } = fakeBrowser();
    const renderer = new PuppeteerPdfRenderer(() => Promise.resolve(browser));

    const pdf = await renderer.render(request);

    expect(pdf.byteLength).toBeGreaterThan(0);
  });

  it('inlines the painted portrait as a data URI', async () => {
    const { browser, journal } = fakeBrowser();
    const renderer = new PuppeteerPdfRenderer(() => Promise.resolve(browser));

    await renderer.render(request);

    // The shared template takes a URL so the browser can use it too; turning
    // bytes into something an <img> accepts is this adapter's job, and it has to
    // be inline or the PDF would fetch during render.
    expect(journal.html[0]).toContain('src="data:image/jpeg;base64,AQID"');
    expect(journal.html[0]).toContain('Pablo Moreno');
  });

  it('launches one browser for the whole run and reuses it', async () => {
    const { browser, journal } = fakeBrowser();
    let launches = 0;
    const renderer = new PuppeteerPdfRenderer(() => {
      launches += 1;

      return Promise.resolve(browser);
    });

    await renderer.render(request);
    await renderer.render(request);
    await renderer.render(request);

    // Thirty launches would cost a minute of a five-minute demo.
    expect(launches).toBe(1);
    expect(journal.pagesOpened).toBe(3);
  });

  it('shares one launch between CVs rendered concurrently', async () => {
    const { browser } = fakeBrowser();
    let launches = 0;
    const renderer = new PuppeteerPdfRenderer(() => {
      launches += 1;

      return Promise.resolve(browser);
    });

    await Promise.all([renderer.render(request), renderer.render(request)]);

    expect(launches).toBe(1);
  });

  it('prints backgrounds, or the header-band template comes out blank', async () => {
    const { browser, journal } = fakeBrowser();
    const renderer = new PuppeteerPdfRenderer(() => Promise.resolve(browser));

    await renderer.render(request);

    expect(journal.pdfOptions[0]).toMatchObject({
      printBackground: true,
      preferCSSPageSize: true,
    });
  });

  it('closes the page even when rendering fails', async () => {
    const { browser, journal } = fakeBrowser({ failPdf: true });
    const renderer = new PuppeteerPdfRenderer(() => Promise.resolve(browser));

    const error = await caughtRejection(() => renderer.render(request));

    // A leaked page is a leaked renderer process; thirty of those end a demo.
    expect(journal.pagesClosed).toBe(1);
    expect(error).toBeInstanceOf(PdfRenderingError);
    expect((error as PdfRenderingError).candidate).toBe('Pablo Moreno');
  });

  it('explains a failed launch instead of leaking a puppeteer stack trace', async () => {
    const renderer = new PuppeteerPdfRenderer(() =>
      Promise.reject(
        new Error('error while loading shared libraries: libnss3.so'),
      ),
    );

    const error = await caughtRejection(() => renderer.render(request));

    expect(error).toBeInstanceOf(PdfRenderingError);
    expect((error as Error).message).toContain('missing system library');
  });

  it('retries the launch after a failure rather than caching it forever', async () => {
    let attempt = 0;
    const { browser } = fakeBrowser();
    const renderer = new PuppeteerPdfRenderer(() => {
      attempt += 1;

      return attempt === 1
        ? Promise.reject(new Error('transient launch failure'))
        : Promise.resolve(browser);
    });

    await caughtRejection(() => renderer.render(request));

    await expect(renderer.render(request)).resolves.toBeDefined();
  });

  it('closes the browser on shutdown, once', async () => {
    const { browser, journal } = fakeBrowser();
    const renderer = new PuppeteerPdfRenderer(() => Promise.resolve(browser));

    await renderer.render(request);
    await renderer.onModuleDestroy();
    await renderer.onModuleDestroy();

    expect(journal.closed).toBe(1);
  });

  it('shuts down cleanly when nothing was ever rendered', async () => {
    const { browser, journal } = fakeBrowser();
    const renderer = new PuppeteerPdfRenderer(() => Promise.resolve(browser));

    await expect(renderer.close()).resolves.toBeUndefined();
    expect(journal.closed).toBe(0);
  });
});
