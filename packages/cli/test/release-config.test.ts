import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const PUBLISHABLE = [
  '@qakit/contracts',
  '@qakit/core',
  '@qakit/playwright',
  '@qakit/api',
  '@qakit/cli',
] as const;

function readJson(relative: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(repoRoot, relative), 'utf8')) as Record<string, unknown>;
}

describe('release config', () => {
  it('versions publishable packages together and ignores the consumer', () => {
    const config = readJson('.changeset/config.json');
    expect(config.access).toBe('restricted');
    expect(config.baseBranch).toBe('main');
    expect(config.ignore).toEqual(['@qakit/reference-consumer']);
    expect(config.fixed).toEqual([ [...PUBLISHABLE] ]);
  });

  it('keeps publishable packages private-scoped without a hardcoded registry', () => {
    const dirs = ['contracts', 'core', 'playwright', 'api', 'cli'];
    for (const dir of dirs) {
      const pkg = readJson(`packages/${dir}/package.json`);
      const publishConfig = pkg.publishConfig as { registry?: string; access?: string };
      expect(pkg.name).toMatch(/^@qakit\//);
      expect(pkg.private).toBeUndefined();
      expect(publishConfig.access).toBe('restricted');
      expect(publishConfig.registry).toBeUndefined();
    }
  });
});
