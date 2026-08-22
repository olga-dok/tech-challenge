export interface ConfigProblem {
  readonly variable: string;
  readonly message: string;
}

/**
 * Thrown at boot when the environment is unusable. Aggregates every problem
 * into one message so a fresh clone gets the full list on the first run,
 * rather than fixing one variable per restart.
 */
export class InvalidConfigurationError extends Error {
  private constructor(
    message: string,
    readonly problems: readonly ConfigProblem[],
  ) {
    super(message);
    this.name = 'InvalidConfigurationError';
  }

  static fromProblems(
    problems: readonly ConfigProblem[],
  ): InvalidConfigurationError {
    const lines = [
      ...new Set(problems.map((p) => `  - ${p.variable}: ${p.message}`)),
    ].sort();

    return new InvalidConfigurationError(
      [
        `Invalid environment configuration (${lines.length} problem${lines.length === 1 ? '' : 's'}):`,
        ...lines,
        '',
        'Copy .env.example to .env at the repo root and fill in the required values.',
      ].join('\n'),
      problems,
    );
  }
}
