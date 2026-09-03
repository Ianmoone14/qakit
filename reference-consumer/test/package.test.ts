import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { CORE_PACKAGE, defineConfig } from '@qakit/core';
import { runExample } from '../src/run-example.js';

const consumerRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('reference-consumer public import', () => {
  it('imports the public @qakit/core package', () => {
    expect(CORE_PACKAGE).toBe('@qakit/core');
  });

  it('can call defineConfig from the public package', () => {
    const config = defineConfig({ project: 'example-project' });
    expect(config.project).toBe('example-project');
  });
});

describe('example run (no Playwright)', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  async function setup(): Promise<{ outputDir: string; artifactSourcePath: string; logs: string[] }> {
    const outputDir = await mkdtemp(path.join(tmpdir(), 'qakit-consumer-'));
    dirs.push(outputDir);
    const artifactSourcePath = path.join(outputDir, 'note.txt');
    await writeFile(artifactSourcePath, 'hello from consumer');
    return { outputDir, artifactSourcePath, logs: [] };
  }

  it('passes: loads config, runs hooks, logs, and stores an artifact', async () => {
    const { outputDir, artifactSourcePath, logs } = await setup();
    const summary = await runExample({
      cwd: consumerRoot,
      outputDir,
      mode: 'pass',
      artifactSourcePath,
      logs,
    });

    expect(summary.project).toBe('example-project');
    expect(summary.status).toBe('passed');
    expect(summary.counts).toEqual({ total: 1, passed: 1, failed: 0, skipped: 0 });
    expect(summary.results[0]?.artifacts).toHaveLength(1);
    expect(await readFile(summary.results[0]?.artifacts[0]?.path ?? '', 'utf8')).toBe(
      'hello from consumer',
    );
    expect(logs.some((line) => line.includes('run started'))).toBe(true);
  });

  it('fails with a coded ExecutionError after hooks, log, and artifact', async () => {
    const { outputDir, artifactSourcePath, logs } = await setup();
    const summary = await runExample({
      cwd: consumerRoot,
      outputDir,
      mode: 'fail',
      artifactSourcePath,
      logs,
    });

    expect(summary.status).toBe('failed');
    expect(summary.results[0]?.status).toBe('failed');
    expect(summary.results[0]?.error?.code).toBe('CHECKOUT_FAILED');
    expect(summary.results[0]?.artifacts).toHaveLength(1);
    expect(logs.some((line) => line.includes('CHECKOUT_FAILED'))).toBe(true);
  });
});
