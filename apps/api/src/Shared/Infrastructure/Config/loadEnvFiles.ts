import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

/**
 * `.env` lives at the repo root, shared by both apps.
 *
 * The cwd differs by entry point — `pnpm --filter api start` runs from
 * `apps/api`, a root-level script from the repo root — so both candidates are
 * tried. The first file found wins; dotenv never overwrites a variable that is
 * already set, which keeps real environment variables (CI, Docker, a one-off
 * `FOO=bar pnpm start`) authoritative over the file.
 */
const CANDIDATE_PATHS = ['../../.env', '.env'];

export function loadEnvFiles(cwd: string = process.cwd()): string | null {
  for (const candidate of CANDIDATE_PATHS) {
    const path = resolve(cwd, candidate);

    if (existsSync(path)) {
      loadDotenv({ path, quiet: true });
      return path;
    }
  }

  return null;
}
