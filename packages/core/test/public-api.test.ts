import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ExecutionError,
  FileSystemArtifactStore,
  LifecycleManager,
  ServiceKeys,
  createExecutionContext,
  createExecutionSummary,
  createLoggerFromConfig,
  createTestContext,
  createTestResult,
  resolveConfig,
  wrapError,
} from '../src/index.js';

describe('public runtime API (wired)', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it('runs config → logger → context → hook → artifact → result', async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), 'qakit-public-api-'));
    dirs.push(outputDir);
    const source = path.join(outputDir, 'shot.txt');
    await writeFile(source, 'shot');

    const logs: string[] = [];
    const config = resolveConfig({
      file: { project: 'checkout-api', logging: { level: 'info', format: 'json' } },
      env: {},
      overrides: { artifacts: { outputDir } },
    });
    const logger = createLoggerFromConfig(config, {
      write: (line) => {
        logs.push(line);
      },
    });
    const store = new FileSystemArtifactStore({ outputDir: config.artifacts.outputDir });
    const execution = createExecutionContext({
      config,
      logger,
      artifacts: store,
      env: {},
    });
    const test = createTestContext(execution, {
      testId: 't1',
      testName: 'public api',
      testFile: 'public.test.ts',
    });

    const manager = new LifecycleManager();
    manager.registerHook('beforeTest', async (ctx) => {
      ctx.services.register(ServiceKeys.Auth, { token: 't' });
    });

    await manager.runBeforeTest(test);
    expect(test.services.get(ServiceKeys.Auth)).toEqual({ token: 't' });

    await store.save({
      type: 'custom',
      name: 'shot.txt',
      path: source,
      executionId: execution.executionId,
      testId: test.testId,
    });
    logger.child({ executionId: execution.executionId, testId: test.testId }).info('saved');

    const result = createTestResult({ ctx: test, status: 'passed', duration: 1, store });
    const summary = createExecutionSummary({ ctx: execution, results: [result] });

    expect(summary.status).toBe('passed');
    expect(result.artifacts).toHaveLength(1);
    expect(logs.some((line) => line.includes('saved'))).toBe(true);
  });

  it('wraps a native throw as ExecutionError', () => {
    const wrapped = wrapError(new Error('native'));
    expect(wrapped).toBeInstanceOf(ExecutionError);
    expect(wrapped.code).toBe('UNEXPECTED_ERROR');
  });
});
