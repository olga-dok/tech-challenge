import { dirname } from 'node:path';
import type { AppConfig } from './AppConfig';
import {
  type ConfigProblem,
  InvalidConfigurationError,
} from './InvalidConfigurationError';
import {
  collectProviderProblems,
  rawEnvSchema,
  toAppConfig,
} from './envSchema';
import { loadEnvFiles } from './loadEnvFiles';

/**
 * The single point where `process.env` is read. Everything else receives the
 * resolved, typed `AppConfig` by injection — so a missing variable is a boot
 * failure with a full problem list, never an `undefined` discovered at runtime.
 *
 * Field-shape and cross-field validation run independently and their problems
 * are merged, so one bad variable never masks another.
 */
export function loadAppConfig(
  source: NodeJS.ProcessEnv,
  baseDir: string = process.cwd(),
): AppConfig {
  const parsed = rawEnvSchema.safeParse(source);

  const fieldProblems: ConfigProblem[] = parsed.success
    ? []
    : parsed.error.issues.map((issue) => ({
        variable: issue.path.join('.') || '(root)',
        message: issue.message,
      }));

  const problems = [...fieldProblems, ...collectProviderProblems(source)];

  if (problems.length > 0) {
    throw InvalidConfigurationError.fromProblems(problems);
  }

  // Unreachable unless parsing succeeded: an empty problem list implies success.
  if (!parsed.success) {
    throw InvalidConfigurationError.fromProblems([
      { variable: '(root)', message: 'failed to parse the environment' },
    ]);
  }

  return toAppConfig(parsed.data, baseDir);
}

/**
 * The one call every entry point makes: find `.env`, then read the environment
 * with the repo root — the directory holding that file — as the anchor for
 * relative paths. Without a `.env` (CI, Docker, real environment variables) the
 * cwd is the only sensible anchor left.
 */
export function loadConfigFromEnvironment(): AppConfig {
  const envFile = loadEnvFiles();

  return loadAppConfig(
    process.env,
    envFile === null ? process.cwd() : dirname(envFile),
  );
}
