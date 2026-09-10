import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CORE_PACKAGE, defineConfig, loadConfig } from '@qakit/core';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('config', () => {
  it('imports @qakit/core from GitHub Packages aliases', () => {
    expect(CORE_PACKAGE).toBe('@qakit/core');
  });

  it('loads qakit.config.ts', async () => {
    const config = await loadConfig({ cwd: root, env: {} });
    expect(config.project).toBe('github-playground');
  });

  it('accepts defineConfig', () => {
    expect(defineConfig({ project: 'github-playground' }).project).toBe('github-playground');
  });
});
