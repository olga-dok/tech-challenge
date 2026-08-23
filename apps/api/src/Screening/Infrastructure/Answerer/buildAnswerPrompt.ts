import type { Question } from '../../Domain/Question';
import type { RetrievedContext } from '../../Domain/GroundedAnswerer';

export interface AnswerPrompt {
  readonly system: string;
  readonly user: string;
}

const SYSTEM_PROMPT = `You are a recruiting assistant answering questions about a corpus of candidate CVs.

Rules:
- Answer ONLY using the numbered context items below. Never use outside knowledge and never guess.
- Cite candidates by name when you reference them.
- If the context does not contain the answer, say so plainly rather than guessing.
- When asked to list matching candidates, list EVERY match present in the context, not a sample.
- Keep answers tight — a few sentences, not an essay.
- Answer in the same language as the question.`;

/**
 * Numbered so the model can point back at a specific item ("candidate #2"),
 * each labelled with exactly what a citation needs to be traced back to its
 * source: name, slug, and section.
 */
export function buildAnswerPrompt(
  question: Question,
  context: readonly RetrievedContext[],
): AnswerPrompt {
  const items =
    context.length === 0
      ? '(no relevant context was found in the corpus)'
      : context
          .map(
            (item, index) =>
              `[${String(index + 1)}] ${item.candidateName} (${item.slug.value}, ${item.section}): ${item.snippet}`,
          )
          .join('\n\n');

  return {
    system: SYSTEM_PROMPT,
    user: `Context:\n${items}\n\nQuestion: ${question.text}`,
  };
}
