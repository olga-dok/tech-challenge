/**
 * Digs the JSON object out of whatever the model actually said.
 *
 * Gemini honours `responseMimeType: application/json`, so this is usually a
 * no-op there. The free OpenRouter models are the reason it exists: they
 * routinely ignore `response_format` and answer with a fenced code block, a
 * preamble ("Here is the JSON you asked for:"), or both.
 *
 * Brace matching rather than a regex, because bullet text contains braces and a
 * greedy pattern would happily return something unparseable.
 */
export function extractJsonObject(raw: string): string | null {
  const withoutFences = raw
    .replace(/```(?:json)?/gi, '\n')
    .replace(/\r\n/g, '\n');

  const start = withoutFences.indexOf('{');
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let insideString = false;
  let escaped = false;

  for (let index = start; index < withoutFences.length; index += 1) {
    const character = withoutFences[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === '"') {
      insideString = !insideString;
      continue;
    }

    if (insideString) {
      continue;
    }

    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        return withoutFences.slice(start, index + 1);
      }
    }
  }

  // Unbalanced: the response was cut off mid-object, which a retry may fix.
  return null;
}
