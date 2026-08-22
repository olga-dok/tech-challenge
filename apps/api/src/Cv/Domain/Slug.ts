import { InvalidSlugError } from './InvalidSlugError';

/**
 * A candidate's public identifier: it addresses them in URLs and names their
 * files on disk. Both make the pattern load-bearing rather than cosmetic — a
 * slug allowed to contain a dot or a slash is a path traversal in the
 * file-serving endpoints.
 */
export class Slug {
  private static readonly PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  private constructor(readonly value: string) {
    this.ensureIsValid(value);
  }

  static from(value: string): Slug {
    return new Slug(value);
  }

  /**
   * Derived from the name, so it is stable across runs: a candidate keeps the
   * same URL and the same files, which is what makes regeneration idempotent
   * rather than duplicative.
   *
   * Accents fold rather than drop, so a Spanish surname becomes a readable slug
   * instead of losing its letters.
   */
  static fromName(fullName: string, disambiguator?: number): Slug {
    const base = fullName
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    if (base.length === 0) {
      throw InvalidSlugError.forName(fullName);
    }

    return new Slug(
      disambiguator === undefined ? base : `${base}-${String(disambiguator)}`,
    );
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  private ensureIsValid(value: string): void {
    if (!Slug.PATTERN.test(value)) {
      throw InvalidSlugError.forValue(value);
    }
  }
}
