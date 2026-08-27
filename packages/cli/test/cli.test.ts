import { mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigurationError } from '@qakit/contracts';
import { initProject } from '../src/commands/init.js';
import { getVersionInfo } from '../src/commands/version.js';

describe('getVersionInfo', () => {
  it('reports cli, core, and contracts versions', () => {
    const info = getVersionInfo();
    expect(info.packages['@qakit/cli']).toBe('0.1.0');
    expect(info.packages['@qakit/core']).toBeDefined();
    expect(info.packages['@qakit/contracts']).toBeDefined();
  });
});

describe('initProject', () => {
  it('writes qakit.config.ts and refuses to overwrite without --force', async () => {
    const dir = join(tmpdir(), `qakit-init-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const written = await initProject(dir);
    const contents = await readFile(written, 'utf8');
    expect(contents).toContain("project: 'example-project'");
    await expect(initProject(dir)).rejects.toBeInstanceOf(ConfigurationError);
    const again = await initProject(dir, { force: true });
    expect(again).toBe(written);
  });
});
