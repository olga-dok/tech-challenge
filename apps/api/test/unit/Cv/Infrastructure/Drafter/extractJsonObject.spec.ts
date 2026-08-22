import { extractJsonObject } from '../../../../../src/Cv/Infrastructure/Drafter/extractJsonObject';

describe('extractJsonObject', () => {
  it('returns a bare JSON object untouched', () => {
    expect(extractJsonObject('{"fullName":"Ana Ruiz"}')).toBe(
      '{"fullName":"Ana Ruiz"}',
    );
  });

  it('unwraps a fenced code block, which free models emit constantly', () => {
    const raw = '```json\n{"fullName":"Ana Ruiz"}\n```';

    expect(extractJsonObject(raw)).toBe('{"fullName":"Ana Ruiz"}');
  });

  it('discards a preamble and a sign-off', () => {
    const raw =
      'Sure! Here is the JSON you asked for:\n{"fullName":"Ana Ruiz"}\nLet me know if you need changes.';

    expect(extractJsonObject(raw)).toBe('{"fullName":"Ana Ruiz"}');
  });

  it('keeps nested objects whole', () => {
    const raw = '{"contact":{"email":"a@b.test"},"skills":["Go"]}';

    expect(extractJsonObject(raw)).toBe(raw);
  });

  it('ignores braces inside strings, which bullet text really does contain', () => {
    const raw =
      '{"summary":"Wrote a parser for ${templates} and {handlebars}"}';

    expect(extractJsonObject(raw)).toBe(raw);
  });

  it('survives an escaped quote before a closing brace', () => {
    const raw = '{"summary":"called it the \\"ledger\\" service"}';

    expect(extractJsonObject(raw)).toBe(raw);
  });

  it('gives up on a response with no object', () => {
    expect(extractJsonObject('I cannot help with that.')).toBeNull();
  });

  it('gives up on a truncated object rather than returning something unparseable', () => {
    expect(extractJsonObject('{"fullName":"Ana","exp')).toBeNull();
  });
});
