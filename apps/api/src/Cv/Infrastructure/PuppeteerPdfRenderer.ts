import { renderCvHtml } from '@repo/cv-templates';
import type { Browser } from 'puppeteer';
import type { Logger } from '../../Shared/Domain';
import type { CvRenderRequest, PdfRenderer } from '../Domain/PdfRenderer';
import { PdfRenderingError } from '../Domain/PdfRenderingError';

export type BrowserLauncher = () => Promise<Browser>;

/**
 * HTML to A4 PDF, via one headless Chromium shared by the whole run.
 *
 * Launching a browser costs a second or two; doing it thirty times costs a
 * minute of a demo. So the browser is launched once, lazily, and each CV gets
 * its own page which is always closed — a leaked page is a leaked renderer
 * process, and thirty of those exhaust a laptop.
 *
 * `printBackground` is not cosmetic: the header-band template is white text on a
 * dark band, and without it that CV prints blank.
 */
export class PuppeteerPdfRenderer implements PdfRenderer {
  private browser: Promise<Browser> | null = null;
  private readonly logger?: Logger;

  constructor(
    private readonly launch: BrowserLauncher = defaultLauncher,
    logger?: Logger,
  ) {
    this.logger = logger?.forContext('PuppeteerPdfRenderer');
  }

  async render(request: CvRenderRequest): Promise<Uint8Array> {
    const browser = await this.browserForRun();
    const page = await browser.newPage();

    try {
      // The document is self-contained — styles inline, portrait inlined as a
      // data URI — so nothing is fetched and `setContent` needs no network idle
      // wait. Inlining is this adapter's job, not the template's: the browser
      // consumer passes a portrait URL instead.
      await page.setContent(
        renderCvHtml({
          profile: request.profile,
          templateId: request.templateId,
          language: request.language,
          portraitUrl: `data:${request.portrait.mimeType};base64,${Buffer.from(request.portrait.bytes).toString('base64')}`,
        }),
        { waitUntil: 'load' },
      );

      return await page.pdf({
        format: 'a4',
        printBackground: true,
        preferCSSPageSize: true,
      });
    } catch (error: unknown) {
      throw PdfRenderingError.forCandidate(request.profile.fullName, error);
    } finally {
      await page.close().catch(() => {
        // A page that will not close must not mask the render error above.
      });
    }
  }

  /** Called by Nest on shutdown; also used by the CLI entry points. */
  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  async close(): Promise<void> {
    const pending = this.browser;
    this.browser = null;

    if (pending === null) {
      return;
    }

    try {
      await (await pending).close();
    } catch (error: unknown) {
      this.logger?.warn('The headless browser did not close cleanly', {
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private browserForRun(): Promise<Browser> {
    // Assigned before awaiting, so a batch of CVs starting together shares one
    // launch instead of racing to start five browsers.
    this.browser ??= this.launch().catch((error: unknown) => {
      this.browser = null;

      throw PdfRenderingError.forBrowserLaunch(error);
    });

    return this.browser;
  }
}

async function defaultLauncher(): Promise<Browser> {
  const puppeteer = await import('puppeteer');

  return puppeteer.launch({
    headless: true,
    // The sandbox needs kernel privileges that CI containers routinely withhold,
    // and the only thing being rendered is HTML this process just generated.
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
    ],
  });
}
