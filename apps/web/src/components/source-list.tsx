import type { Citation } from "@repo/contracts";
import { SourceList as UiSourceList, type SourceListItem } from "@repo/ui";
import { UI_LABELS, type UiLanguage } from "./ui-language";

export function filterCitationsReferencedInAnswer(
  citations: readonly Citation[],
  answer: string,
): readonly Citation[] {
  const citedIndexes = [...answer.matchAll(/\[([^\]]+)\]/g)].flatMap(
    (match) => {
      const groupedReferences = match[1] ?? "";

      return (groupedReferences.match(/\d+/g) ?? []).map(Number);
    },
  );

  const references = citedIndexes
    .filter((index) => Number.isInteger(index) && index > 0)
    .map((index) => citations[index - 1])
    .filter((citation): citation is Citation => citation !== undefined);

  return references.length > 0 ? references : citations;
}

export function uniqueCitationsByCandidate(
  citations: readonly Citation[],
): readonly Citation[] {
  const bySlug = new Map<string, Citation>();

  for (const citation of citations) {
    const existing = bySlug.get(citation.slug);
    if (!existing || citation.score > existing.score) {
      bySlug.set(citation.slug, citation);
    }
  }

  return [...bySlug.values()];
}

export function SourceList({
  citations,
  answer,
  language,
}: {
  citations: readonly Citation[];
  answer: string;
  language: UiLanguage;
}) {
  const labels = UI_LABELS[language];
  const citationsInAnswer = filterCitationsReferencedInAnswer(
    citations,
    answer,
  );
  const uniqueCitations = uniqueCitationsByCandidate(citationsInAnswer);
  const items: readonly SourceListItem[] = uniqueCitations.map(
    (citation, index) => ({
      key: `${citation.slug}-${String(citation.ordinal)}-${citation.section}`,
      href: `/api/proxy/cvs/${citation.slug}/pdf`,
      label: `[${index + 1}] ${citation.section} · ${citation.score.toFixed(2)}`,
      title: citation.snippet,
    }),
  );

  return <UiSourceList heading={labels.sources} items={items} />;
}
