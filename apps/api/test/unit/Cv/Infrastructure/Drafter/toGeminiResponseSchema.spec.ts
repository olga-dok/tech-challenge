import { z } from 'zod';
import { CandidateProfileSchema } from '@repo/contracts';
import { toGeminiResponseSchema } from '../../../../../src/Cv/Infrastructure/Drafter/toGeminiResponseSchema';

const asRecord = (value: unknown): Record<string, unknown> =>
  value as Record<string, unknown>;

describe('toGeminiResponseSchema', () => {
  const converted = toGeminiResponseSchema(
    z.toJSONSchema(CandidateProfileSchema, { io: 'input' }),
  );

  it('keeps the shape of the contract', () => {
    expect(converted['type']).toBe('object');
    expect(Object.keys(asRecord(converted['properties']))).toEqual([
      'fullName',
      'headline',
      'contact',
      'summary',
      'experience',
      'education',
      'skills',
      'languages',
      'certifications',
    ]);
    expect(converted['required']).toContain('experience');
  });

  it('strips every keyword the API would reject', () => {
    const serialised = JSON.stringify(converted);

    // `$schema` is the one that actually bites: the API rejects the request
    // outright rather than ignoring the unknown field.
    expect(serialised).not.toContain('$schema');
    expect(serialised).not.toContain('$ref');
    expect(serialised).not.toContain('$defs');
    expect(serialised).not.toContain('anyOf');
    expect(serialised).not.toContain('additionalProperties');
  });

  it('rewrites a nullable union as the type plus nullable', () => {
    const contact = asRecord(asRecord(converted['properties'])['contact']);
    const linkedin = asRecord(asRecord(contact['properties'])['linkedin']);

    expect(linkedin).toEqual({ type: 'string', nullable: true });
  });

  it('suggests a property order, which structured output follows more reliably', () => {
    expect(converted['propertyOrdering']).toEqual([
      'fullName',
      'headline',
      'contact',
      'summary',
      'experience',
      'education',
      'skills',
      'languages',
      'certifications',
    ]);
  });

  it('converts array items, including a nullable field nested inside one', () => {
    const experience = asRecord(
      asRecord(converted['properties'])['experience'],
    );
    const items = asRecord(experience['items']);
    const endDate = asRecord(asRecord(items['properties'])['endDate']);

    expect(experience['type']).toBe('array');
    expect(items['type']).toBe('object');
    expect(endDate['nullable']).toBe(true);
    expect(endDate['type']).toBe('string');
  });

  it('keeps the enum on a nested field', () => {
    const languages = asRecord(asRecord(converted['properties'])['languages']);
    const level = asRecord(
      asRecord(asRecord(languages['items'])['properties'])['level'],
    );

    expect(level['enum']).toEqual([
      'NATIVE',
      'FLUENT',
      'ADVANCED',
      'INTERMEDIATE',
      'BASIC',
    ]);
  });

  it('resolves a $ref, so reusing a sub-schema cannot silently break generation', () => {
    const withRef = {
      type: 'object',
      properties: { contact: { $ref: '#/$defs/Contact' } },
      $defs: {
        Contact: {
          type: 'object',
          properties: { email: { type: 'string', minLength: 3 } },
        },
      },
    };

    const result = toGeminiResponseSchema(withRef);
    const contact = asRecord(asRecord(result['properties'])['contact']);

    expect(contact['type']).toBe('object');
    expect(Object.keys(asRecord(contact['properties']))).toEqual(['email']);
  });
});
