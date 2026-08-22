import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadEnvFiles } from '../../../../../src/Shared/Infrastructure/Config/loadEnvFiles';

const TRACKED_KEYS = ['CONFIG_SPEC_FROM_FILE', 'CONFIG_SPEC_PRESET'] as const;

describe('loadEnvFiles', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cv-screener-env-'));
    for (const key of TRACKED_KEYS) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    for (const key of TRACKED_KEYS) {
      delete process.env[key];
    }
  });

  it('loads the repo-root .env when the cwd is apps/api', () => {
    writeFileSync(join(root, '.env'), 'CONFIG_SPEC_FROM_FILE=from-root\n');
    const apiDir = join(root, 'apps', 'api');
    mkdirSync(apiDir, { recursive: true });

    const loaded = loadEnvFiles(apiDir);

    expect(loaded).toBe(resolve(root, '.env'));
    expect(process.env.CONFIG_SPEC_FROM_FILE).toBe('from-root');
  });

  it('loads a local .env when the cwd is the repo root', () => {
    writeFileSync(join(root, '.env'), 'CONFIG_SPEC_FROM_FILE=from-cwd\n');

    expect(loadEnvFiles(root)).toBe(resolve(root, '.env'));
    expect(process.env.CONFIG_SPEC_FROM_FILE).toBe('from-cwd');
  });

  it('reports no file rather than throwing when none exists', () => {
    expect(loadEnvFiles(root)).toBeNull();
  });

  // Real environment variables must win over the file, so CI, Docker and a
  // one-off `FOO=bar pnpm start` all stay authoritative.
  it('does not overwrite a variable that is already set', () => {
    process.env.CONFIG_SPEC_PRESET = 'from-environment';
    writeFileSync(join(root, '.env'), 'CONFIG_SPEC_PRESET=from-file\n');

    loadEnvFiles(root);

    expect(process.env.CONFIG_SPEC_PRESET).toBe('from-environment');
  });
});
