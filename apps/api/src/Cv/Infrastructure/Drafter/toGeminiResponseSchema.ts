/**
 * Turns the zod-derived JSON Schema into the dialect Gemini's `responseSchema`
 * accepts.
 *
 * The alternative was hand-writing the response schema next to
 * `CandidateProfileSchema`, which is the same shape twice and one of them
 * silently drifting. This keeps one source of truth and pays for it with a
 * converter — which is a pure function, so it is cheap to test.
 *
 * Two dialect differences matter:
 *   * JSON Schema expresses "nullable" as `anyOf: [T, null]`; Gemini wants the
 *     type plus `nullable: true`.
 *   * anything Gemini does not recognise is rejected outright rather than
 *     ignored, so unknown keywords (`$schema` above all) have to be dropped.
 */

/** Keywords the API documents support for. Everything else is stripped. */
const SUPPORTED_KEYWORDS = new Set([
  'type',
  'description',
  'enum',
  'format',
  'items',
  'maxItems',
  'maxLength',
  'maximum',
  'minItems',
  'minLength',
  'minimum',
  'pattern',
  'properties',
  'required',
]);

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNullType = (value: unknown): boolean =>
  isObject(value) && value['type'] === 'null';

export function toGeminiResponseSchema(jsonSchema: unknown): JsonObject {
  if (!isObject(jsonSchema)) {
    throw new TypeError('A JSON Schema object is required');
  }

  const definitions = isObject(jsonSchema['$defs']) ? jsonSchema['$defs'] : {};

  return convert(jsonSchema, definitions);
}

function convert(node: JsonObject, definitions: JsonObject): JsonObject {
  // `$defs`/`$ref` are unreachable with today's contracts, which zod inlines.
  // Handled anyway because the day someone reuses a sub-schema, generation would
  // otherwise start failing with an opaque 400 from the provider.
  const resolved = resolveRef(node, definitions);
  const nullableUnion = asNullableUnion(resolved);

  if (nullableUnion !== null) {
    return { ...convert(nullableUnion, definitions), nullable: true };
  }

  const converted: JsonObject = {};

  for (const [keyword, value] of Object.entries(resolved)) {
    if (!SUPPORTED_KEYWORDS.has(keyword)) {
      continue;
    }

    if (keyword === 'properties' && isObject(value)) {
      converted['properties'] = Object.fromEntries(
        Object.entries(value).map(([property, schema]) => [
          property,
          isObject(schema) ? convert(schema, definitions) : {},
        ]),
      );
      // Field order is a documented lever on structured-output quality: without
      // it the model may emit keys in an order the schema did not suggest.
      converted['propertyOrdering'] = Object.keys(value);
      continue;
    }

    if (keyword === 'items' && isObject(value)) {
      converted['items'] = convert(value, definitions);
      continue;
    }

    converted[keyword] = value;
  }

  return converted;
}

function resolveRef(node: JsonObject, definitions: JsonObject): JsonObject {
  const reference = node['$ref'];
  if (typeof reference !== 'string') {
    return node;
  }

  const name = reference.replace('#/$defs/', '');
  const target = definitions[name];

  if (!isObject(target)) {
    throw new TypeError(`Unresolvable schema reference: ${reference}`);
  }

  return target;
}

/** `anyOf: [T, null]` — zod's rendering of `.nullable()`. */
function asNullableUnion(node: JsonObject): JsonObject | null {
  const anyOf = node['anyOf'];

  if (!Array.isArray(anyOf) || anyOf.length !== 2) {
    return null;
  }

  const members: unknown[] = anyOf;
  const [first, second] = members;

  if (isNullType(second) && isObject(first)) {
    return first;
  }

  if (isNullType(first) && isObject(second)) {
    return second;
  }

  return null;
}
