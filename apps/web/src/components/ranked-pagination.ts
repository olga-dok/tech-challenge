export function rankingChanged(
  previousSignature: string,
  nextSignature: string,
): boolean {
  return previousSignature !== nextSignature;
}

export function rankingQuestionChanged(
  previousQuestion: string,
  nextQuestion: string,
): boolean {
  return previousQuestion !== nextQuestion;
}

export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}
