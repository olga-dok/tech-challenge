import type { Citation } from "@repo/contracts";
import {
  filterCitationsReferencedInAnswer,
  uniqueCitationsByCandidate,
} from "./source-list";

function citation(overrides: Partial<Citation>): Citation {
  return {
    candidateId: "94d9d6f8-b2ae-43b0-ad7f-c30f29840e7f",
    candidateName: "Ana Ruiz",
    slug: "ana-ruiz",
    section: "EDUCATION",
    ordinal: 0,
    snippet: "Universitat Politècnica de Catalunya (UPC)",
    score: 0.5,
    ...overrides,
  };
}

describe("source-list", () => {
  it("keeps only citations referenced in the answer when citation markers exist", () => {
    const citations: readonly Citation[] = [
      citation({ slug: "ana-ruiz", ordinal: 0 }),
      citation({ slug: "marc-soler", ordinal: 1 }),
      citation({ slug: "laia-costa", ordinal: 2 }),
    ];

    const referenced = filterCitationsReferencedInAnswer(
      citations,
      "Top matches are [1] and [2].",
    );

    expect(referenced).toHaveLength(2);
    expect(referenced.map((item) => item.slug)).toEqual([
      "ana-ruiz",
      "marc-soler",
    ]);
  });

  it("supports grouped citation markers inside a single bracket", () => {
    const citations: readonly Citation[] = [
      citation({ slug: "ana-ruiz", ordinal: 0 }),
      citation({ slug: "marc-soler", ordinal: 1 }),
      citation({ slug: "laia-costa", ordinal: 2 }),
      citation({ slug: "luca-novak", ordinal: 3 }),
    ];

    const referenced = filterCitationsReferencedInAnswer(
      citations,
      "Python candidates include Ana [1, 3] and Luca [4].",
    );

    expect(referenced.map((item) => item.slug)).toEqual([
      "ana-ruiz",
      "laia-costa",
      "luca-novak",
    ]);
  });

  it("falls back to all citations when answer has no citation markers", () => {
    const citations: readonly Citation[] = [
      citation({ slug: "ana-ruiz", ordinal: 0 }),
      citation({ slug: "marc-soler", ordinal: 1 }),
    ];

    const referenced = filterCitationsReferencedInAnswer(
      citations,
      "Two candidates graduated from UPC.",
    );

    expect(referenced).toEqual(citations);
  });

  it("keeps one strongest citation per candidate", () => {
    const citations: readonly Citation[] = [
      citation({ slug: "ana-ruiz", score: 0.41, ordinal: 1 }),
      citation({ slug: "ana-ruiz", score: 0.72, ordinal: 2 }),
      citation({
        candidateId: "6fa10f2a-2946-4d5c-8f4f-4f537324e13c",
        candidateName: "Marc Soler",
        slug: "marc-soler",
        score: 0.63,
      }),
    ];

    const unique = uniqueCitationsByCandidate(citations);

    expect(unique).toHaveLength(2);
    expect(unique.find((item) => item.slug === "ana-ruiz")?.score).toBe(0.72);
    expect(unique.find((item) => item.slug === "marc-soler")?.score).toBe(0.63);
  });
});
