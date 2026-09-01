import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ConfigurationError } from '@qakit/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CONFIG_ERROR_CODES,
  defineConfig,
  loadConfig,
  resolveConfig,
  validateConfig,
} from '../src/index.js';

const emptyEnv = {};

describe('defineConfig', () => {
  it('returns the same object', () => {
    const input = { project: 'checkout-api', environment: 'development' };
    expect(defineConfig(input)).toBe(input);
  });
});

describe('validateConfig', () => {
  it('accepts a minimal kebab-case project', () => {
    const parsed = validateConfig({ project: 'checkout-api' });
    expect(parsed.project).toBe('checkout-api');
  });

  it('rejects uppercase project names with INVALID_PROJECT', () => {
    try {
      validateConfig({ project: 'Checkout' });
      expect.unreachable('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as ConfigurationError).code).toBe(CONFIG_ERROR_CODES.INVALID_PROJECT);
    }
  });

  it('rejects an invalid baseUrl with INVALID_BASE_URL', () => {
    try {
      validateConfig({ project: 'demo', baseUrl: 'not-a-url' });
      expect.unreachable('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as ConfigurationError).code).toBe(CONFIG_ERROR_CODES.INVALID_BASE_URL);
      expect((error as ConfigurationError).cause).toBeDefined();
    }
  });
});

describe('resolveConfig', () => {
  it('fills defaults for a minimal file config', () => {
    const resolved = resolveConfig({
      file: { project: 'checkout-api' },
      env: emptyEnv,
    });
    expect(resolved.project).toBe('checkout-api');
    expect(resolved.environment).toBe('development');
    expect(resolved.retry).toEqual({ attempts: 0, delay: 0 });
    expect(resolved.logging).toEqual({ level: 'info', format: 'pretty' });
    expect(resolved.artifacts).toEqual({ outputDir: 'artifacts' });
    expect(resolved.extensions).toEqual([]);
    expect(resolved.baseUrl).toBeUndefined();
  });

  it('lets env overlay beat the file', () => {
    const resolved = resolveConfig({
      file: { project: 'from-file', environment: 'file-env', logging: { level: 'warn' } },
      env: {
        QAKIT_PROJECT: 'from-env',
        QAKIT_ENVIRONMENT: 'env-env',
        QAKIT_LOG_LEVEL: 'debug',
      },
    });
    expect(resolved.project).toBe('from-env');
    expect(resolved.environment).toBe('env-env');
    expect(resolved.logging.level).toBe('debug');
    expect(resolved.logging.format).toBe('pretty');
  });

  it('lets runtime overrides beat env', () => {
    const resolved = resolveConfig({
      file: { project: 'from-file', environment: 'file-env' },
      env: { QAKIT_PROJECT: 'from-env', QAKIT_ENVIRONMENT: 'env-env' },
      overrides: { project: 'from-runtime' },
    });
    expect(resolved.project).toBe('from-runtime');
    expect(resolved.environment).toBe('env-env');
  });

  it('deep-merges retry so a partial file overlay keeps default delay', () => {
    const resolved = resolveConfig({
      file: { project: 'checkout-api', retry: { attempts: 2 } },
      env: emptyEnv,
    });
    expect(resolved.retry).toEqual({ attempts: 2, delay: 0 });
  });

  it('requires project after merge', () => {
    try {
      resolveConfig({ env: emptyEnv });
      expect.unreachable('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as ConfigurationError).code).toBe(CONFIG_ERROR_CODES.MISSING_PROJECT);
    }
  });

  it('rejects uppercase project from env', () => {
    try {
      resolveConfig({ env: { QAKIT_PROJECT: 'Checkout' } });
      expect.unreachable('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as ConfigurationError).code).toBe(CONFIG_ERROR_CODES.INVALID_PROJECT);
    }
  });

  it('rejects an invalid log level from env', () => {
    try {
      resolveConfig({
        file: { project: 'checkout-api' },
        env: { QAKIT_LOG_LEVEL: 'verbose' },
      });
      expect.unreachable('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as ConfigurationError).code).toBe(CONFIG_ERROR_CODES.INVALID_LOGGING);
    }
  });
});

describe('loadConfig', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  async function tempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'qakit-config-'));
    dirs.push(dir);
    return dir;
  }

  it('loads qakit.config.ts from cwd', async () => {
    const cwd = await tempDir();
    await writeFile(
      path.join(cwd, 'qakit.config.ts'),
      `export default { project: 'checkout-api', environment: 'staging' };\n`,
    );

    const resolved = await loadConfig({ cwd, env: emptyEnv });
    expect(resolved.project).toBe('checkout-api');
    expect(resolved.environment).toBe('staging');
  });

  it('loads a file at an explicit path', async () => {
    const cwd = await tempDir();
    const nested = path.join(cwd, 'config');
    await mkdir(nested);
    const filePath = path.join(nested, 'team.config.ts');
    await writeFile(filePath, `export default { project: 'from-path' };\n`);

    const resolved = await loadConfig({ cwd, path: filePath, env: emptyEnv });
    expect(resolved.project).toBe('from-path');
  });

  it('throws CONFIG_FILE_NOT_FOUND when the file is missing', async () => {
    const cwd = await tempDir();
    try {
      await loadConfig({ cwd, env: emptyEnv });
      expect.unreachable('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as ConfigurationError).code).toBe(CONFIG_ERROR_CODES.CONFIG_FILE_NOT_FOUND);
    }
  });

  it('throws CONFIG_FILE_INVALID when the file has no default object export', async () => {
    const cwd = await tempDir();
    await writeFile(path.join(cwd, 'qakit.config.ts'), `export const project = 'checkout-api';\n`);

    try {
      await loadConfig({ cwd, env: emptyEnv });
      expect.unreachable('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as ConfigurationError).code).toBe(CONFIG_ERROR_CODES.CONFIG_FILE_INVALID);
    }
  });
});
