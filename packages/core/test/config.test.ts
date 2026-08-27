import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigurationError } from '@qakit/contracts';
import { defineConfig } from '../src/config/define.js';
import { loadConfig } from '../src/config/load.js';
import { resolveConfig } from '../src/config/resolve.js';
import { validateConfig } from '../src/config/validate.js';

describe('defineConfig', () => {
  it('returns the same object', () => {
    const config = defineConfig({ project: 'example-project' });
    expect(config.project).toBe('example-project');
  });
});

describe('validateConfig', () => {
  it('throws ConfigurationError with issue paths', () => {
    expect(() => validateConfig({ project: 'Nope' })).toThrow(ConfigurationError);
    try {
      validateConfig({ project: 'Nope' });
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      const typed = error as ConfigurationError;
      expect(typed.code).toBe('CONFIG_VALIDATION_FAILED');
      expect(typed.context).toBeDefined();
    }
  });
});

describe('resolveConfig', () => {
  it('applies defaults, then file, then env, then overrides', () => {
    const resolved = resolveConfig({
      loaded: {
        project: 'from-file',
        environment: 'development',
        logging: { level: 'debug', format: 'pretty' },
      },
      env: {
        QAKIT_PROJECT: 'from-env',
        QAKIT_ENVIRONMENT: 'staging',
        QAKIT_LOG_LEVEL: 'warn',
      },
      overrides: { environment: 'production' },
    });

    expect(resolved.project).toBe('from-env');
    expect(resolved.environment).toBe('production');
    expect(resolved.logging.level).toBe('warn');
    expect(resolved.retry.attempts).toBe(0);
    expect(resolved.artifacts.outputDir).toBe('artifacts');
  });

  it('uses json logging in CI when format is not set', () => {
    const resolved = resolveConfig({
      loaded: { project: 'ci-project' },
      env: { CI: 'true' },
    });
    expect(resolved.logging.format).toBe('json');
  });
});

describe('loadConfig', () => {
  it('returns undefined when no config file exists', async () => {
    const dir = join(tmpdir(), `qakit-empty-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await expect(loadConfig(dir)).resolves.toBeUndefined();
  });

  it('loads a qakit.config.mjs file', async () => {
    const dir = join(tmpdir(), `qakit-cfg-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'qakit.config.mjs'),
      'export default { project: "loaded-project", environment: "test" };\n',
      'utf8',
    );
    const loaded = await loadConfig(dir);
    expect(loaded?.project).toBe('loaded-project');
    expect(loaded?.environment).toBe('test');
  });
});
