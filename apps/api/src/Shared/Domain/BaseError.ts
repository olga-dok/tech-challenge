/**
 * The root of every error this codebase throws on purpose.
 *
 * Its only job today is to make "ours" distinguishable from "a bug or a library"
 * at a catch site. The HTTP-carrying subclasses and the RFC 7807 filter arrive
 * with the API surface; domain errors do not need a status code to be correct.
 */
export abstract class BaseError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
