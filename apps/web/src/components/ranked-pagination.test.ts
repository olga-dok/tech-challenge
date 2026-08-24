import {
  clampPage,
  rankingChanged,
  rankingQuestionChanged,
} from "./ranked-pagination";

describe("ranked-pagination", () => {
  it("detects a changed ranking signature", () => {
    expect(rankingChanged("a,b,c", "a,b,c")).toBe(false);
    expect(rankingChanged("a,b,c", "c,b,a")).toBe(true);
  });

  it("detects a changed ranked question", () => {
    expect(
      rankingQuestionChanged("Who knows Python?", "Who knows Python?"),
    ).toBe(false);
    expect(rankingQuestionChanged("Who knows Python?", "Who knows Java?")).toBe(
      true,
    );
  });

  it("clamps page to valid bounds", () => {
    expect(clampPage(4, 2)).toBe(2);
    expect(clampPage(0, 2)).toBe(1);
    expect(clampPage(2, 5)).toBe(2);
  });
});
