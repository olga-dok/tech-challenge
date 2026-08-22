import {
  CV_TEMPLATE_IDS,
  isCvTemplateId,
  type CvLanguage,
} from "@repo/contracts";
import { renderCvHtml, sampleProfile } from "@repo/cv-templates";
import Link from "next/link";

export const metadata = {
  title: "CV template preview",
  description:
    "Render the CV templates in the browser, without a PDF round trip.",
};

/**
 * Renders the CV templates in the browser, from the same package the PDF
 * renderer uses.
 *
 * The document goes into an iframe `srcdoc` rather than the page itself for two
 * reasons: its CSS is print CSS with page rules and absolute units, which would
 * fight the app's Tailwind, and an iframe is the honest preview — what you see
 * is the document, not the document reinterpreted by its host.
 */
export default async function CvPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; language?: string }>;
}) {
  const params = await searchParams;
  const requested = params.template ?? "";
  const templateId = isCvTemplateId(requested) ? requested : CV_TEMPLATE_IDS[0];
  const language: CvLanguage = params.language === "en" ? "en" : "es";

  const document = renderCvHtml({
    profile: sampleProfile(),
    templateId,
    language,
    // No corpus yet, so the preview uses a placeholder. Once the gallery exists
    // this becomes /api/proxy/cvs/<slug>/portrait for a real candidate.
    portraitUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#dbeafe"/><text x="100" y="100" font-family="Helvetica" font-size="72" font-weight="600" fill="#1e3a8a" text-anchor="middle" dominant-baseline="central">PM</text></svg>',
      ),
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            CV template preview
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Rendered from <code>@repo/cv-templates</code> — the same package the
            PDF renderer uses.
          </p>
        </div>
        <nav aria-label="Template" className="flex flex-wrap gap-2">
          {CV_TEMPLATE_IDS.map((id) => (
            <Link
              key={id}
              href={`/preview/cv?template=${id}&language=${language}`}
              aria-current={id === templateId ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 ${
                id === templateId
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              {id}
            </Link>
          ))}
          <Link
            href={`/preview/cv?template=${templateId}&language=${language === "es" ? "en" : "es"}`}
            className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300"
          >
            {language === "es" ? "switch to English" : "cambiar a español"}
          </Link>
        </nav>
      </header>

      <iframe
        // Keyed so switching template replaces the document rather than mutating it.
        key={`${templateId}-${language}`}
        title={`${templateId} template, ${language}`}
        srcDoc={document}
        // A4 aspect ratio, so the browser preview and the printed page agree.
        className="h-[1120px] w-full rounded-lg border border-zinc-300 bg-white shadow-sm dark:border-zinc-700"
        sandbox=""
      />
    </main>
  );
}
