import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ServiceKeys, resolveConfig, runQakitTest } from '../src/index.js';

describe('runQakitTest', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  async function outputDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'qakit-run-'));
    dirs.push(dir);
    return dir;
  }

  it('runs register + beforeTest + callback and returns a passed summary', async () => {
    const artifacts = await outputDir();
    const order: string[] = [];
    const summary = await runQakitTest({
      name: 'registers a service',
      config: resolveConfig({
        file: { project: 'checkout-api' },
        env: {},
        overrides: { artifacts: { outputDir: artifacts } },
      }),
      env: {},
      cwd: artifacts,
      register: (manager) => {
        manager.registerHook('beforeTest', async (ctx) => {
          order.push('beforeTest');
          ctx.services.register(ServiceKeys.Auth, { token: 't' });
        });
        manager.registerHook('afterTest', async () => {
          order.push('afterTest');
        });
        manager.registerHook('cleanup', async () => {
          order.push('cleanup');
        });
      },
      run: async (ctx) => {
        order.push('run');
        expect(ctx.services.get(ServiceKeys.Auth)).toEqual({ token: 't' });
      },
    });

    expect(summary.status).toBe('passed');
    expect(summary.results[0]?.status).toBe('passed');
    expect(summary.results[0]?.testName).toBe('registers a service');
    expect(order).toEqual(['beforeTest', 'run', 'afterTest', 'cleanup']);
  });

  it('records a failed summary and still runs cleanup', async () => {
    const artifacts = await outputDir();
    let cleaned = false;
    const summary = await runQakitTest({
      name: 'blows up',
      config: resolveConfig({
        file: { project: 'checkout-api' },
        env: {},
        overrides: { artifacts: { outputDir: artifacts } },
      }),
      env: {},
      cwd: artifacts,
      register: (manager) => {
        manager.registerHook('cleanup', async () => {
          cleaned = true;
        });
      },
      run: async () => {
        throw new Error('boom');
      },
    });

    expect(cleaned).toBe(true);
    expect(summary.status).toBe('failed');
    expect(summary.results[0]?.error?.message).toBe('boom');
    expect(summary.results[0]?.error?.code).toBe('UNEXPECTED_ERROR');
  });

  it('re-throws the original error when throwOnFailure is true', async () => {
    const artifacts = await outputDir();
    await expect(
      runQakitTest({
        name: 'throws through',
        throwOnFailure: true,
        config: resolveConfig({
          file: { project: 'checkout-api' },
          env: {},
          overrides: { artifacts: { outputDir: artifacts } },
        }),
        env: {},
        cwd: artifacts,
        run: async () => {
          throw new Error('visible');
        },
      }),
    ).rejects.toThrow('visible');
  });
});
