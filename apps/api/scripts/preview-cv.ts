import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  CV_TEMPLATE_IDS,
  isCvTemplateId,
  type CvTemplateId,
} from '@repo/contracts';
import { sampleProfile } from '@repo/cv-templates';
import { CorpusPlan } from '../src/Cv/Domain/CorpusPlan';
import { SvgAvatarPainter } from '../src/Cv/Infrastructure/Portrait/SvgAvatarPainter';
import { PuppeteerPdfRenderer } from '../src/Cv/Infrastructure/PuppeteerPdfRenderer';
import { loadConfigFromEnvironment } from '../src/Shared/Infrastructure/Config';

/**
 * Renders a fixture profile through the templates and writes the PDFs to
 * `storage/`.
 *
 * The point is iteration without cost: templates are the part of this pipeline
 * most likely to need twenty small fixes, and none of those should spend an LLM
 * call or a portrait request. The fixture is checked in and the portrait comes
 * from the local SVG painter, so this runs offline and needs no key.
 *
 *   pnpm --filter api preview:cv            all three templates
 *   pnpm --filter api preview:cv sidebar    just one
 */
async function main(): Promise<void> {
  const config = loadConfigFromEnvironment();
  const requested = process.argv[2];

  if (requested !== undefined && !isCvTemplateId(requested)) {
    throw new Error(
      `Unknown template "${requested}". Known: ${CV_TEMPLATE_IDS.join(', ')}`,
    );
  }

  const templates: readonly CvTemplateId[] =
    requested === undefined ? CV_TEMPLATE_IDS : [requested];

  // A Spanish-language persona, so the preview also shows the localised headings
  // the chunker relies on.
  const persona = CorpusPlan.build(30, 42).personaAt(5);
  const portrait = await new SvgAvatarPainter().paint(persona);
  const renderer = new PuppeteerPdfRenderer();
  await mkdir(config.storageDir, { recursive: true });

  try {
    for (const templateId of templates) {
      const started = Date.now();
      const pdf = await renderer.render({
        profile: sampleProfile(),
        portrait,
        templateId,
        language: 'es',
      });

      const path = join(config.storageDir, `preview-${templateId}.pdf`);
      await writeFile(path, pdf);
      console.warn(
        `✓ ${templateId.padEnd(11)} ${String(Math.round(pdf.byteLength / 1024)).padStart(4)} KB  ${String(Date.now() - started).padStart(5)} ms  ${path}`,
      );
    }
  } finally {
    await renderer.close();
  }
}

main().catch((error: unknown) => {
  console.error(
    `\n✗ ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
