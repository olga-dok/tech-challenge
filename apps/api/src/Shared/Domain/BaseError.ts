/**
 * The root of every error this codebase throws on purpose.
 *
 * Its only job is to make "ours" distinguishable from "a bug or a library" at
 * a catch site. `HttpError` (see `HttpError.ts`) adds a status code for
 * anything that crosses the API boundary; plain domain errors that never do
 * (construction-time invariants, internal guards) stay directly on this base.
 */
export abstract class BaseError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
