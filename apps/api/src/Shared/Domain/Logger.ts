/**
 * The logging port. Adapters that talk to flaky free services need to say what
 * they did — which portrait provider actually served an image, how long a
 * retry waited — and the code doing that should not know whether the sink is
 * Nest, a file, or nothing at all.
 */
export interface LogContext {
  readonly [key: string]: string | number | boolean | null | undefined;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  /** A child logger tagged with a component name, so lines are attributable. */
  forContext(name: string): Logger;
}

export const LoggerId = Symbol('Logger');
