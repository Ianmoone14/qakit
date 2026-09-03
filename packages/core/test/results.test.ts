import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  FileSystemArtifactStore,
  createExecutionSummary,
  createTestResult,
} from '../src/index.js';
import { testCase, testExecution } from './helpers.js';

describe('createTestResult', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it('attaches artifacts from the store for that test', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'qakit-result-'));
    dirs.push(root);
    const source = path.join(root, 'fail.png');
    await writeFile(source, 'img');

    const store = new FileSystemArtifactStore({ outputDir: path.join(root, 'art') });
    const execution = testExecution();
    const ctx = testCase(execution);

    await store.save({
      type: 'screenshot',
      name: 'fail.png',
      path: source,
      executionId: execution.executionId,
      testId: ctx.testId,
    });

    const result = createTestResult({
      ctx,
      status: 'failed',
      duration: 12,
      store,
      error: { message: 'expected visible', code: 'ASSERTION' },
    });

    expect(result.status).toBe('failed');
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0]?.type).toBe('screenshot');
    expect(result.error?.code).toBe('ASSERTION');
    expect(result.testId).toBe(ctx.testId);
    expect(result.tags).toEqual(ctx.tags);
  });

  it('only uses contract fields (no Allure or Xray keys)', () => {
    const result = createTestResult({
      ctx: testCase(testExecution()),
      status: 'passed',
      duration: 1,
    });

    expect(Object.keys(result).sort()).toEqual(
      ['artifacts', 'attempt', 'duration', 'status', 'tags', 'testFile', 'testId', 'testName'].sort(),
    );
    expect(JSON.stringify(result)).not.toMatch(/allure/i);
    expect(JSON.stringify(result)).not.toMatch(/xray/i);
  });
});

describe('createExecutionSummary', () => {
  it('counts statuses and treats timedOut as failed for the run', () => {
    const ctx = testExecution();
    const base = testCase(ctx);

    const results = [
      createTestResult({ ctx: { ...base, testId: 'p1' }, status: 'passed', duration: 1 }),
      createTestResult({ ctx: { ...base, testId: 'p2' }, status: 'passed', duration: 1 }),
      createTestResult({ ctx: { ...base, testId: 'f1' }, status: 'failed', duration: 1 }),
      createTestResult({ ctx: { ...base, testId: 's1' }, status: 'skipped', duration: 0 }),
      createTestResult({ ctx: { ...base, testId: 'to1' }, status: 'timedOut', duration: 30 }),
    ];

    const summary = createExecutionSummary({
      ctx,
      results,
      endTime: new Date(ctx.startTime.getTime() + 1000),
    });

    expect(summary.status).toBe('failed');
    expect(summary.counts).toEqual({ total: 5, passed: 2, failed: 2, skipped: 1 });
    expect(summary.duration).toBe(1000);
    expect(summary.results).toHaveLength(5);
    expect(summary.project).toBe(ctx.project);
    expect(summary.executionId).toBe(ctx.executionId);
  });

  it('honours an explicit cancelled status', () => {
    const ctx = testExecution();
    const summary = createExecutionSummary({
      ctx,
      results: [createTestResult({ ctx: testCase(ctx), status: 'passed', duration: 1 })],
      status: 'cancelled',
    });
    expect(summary.status).toBe('cancelled');
  });

  it('only uses contract fields (no Allure or Xray keys)', () => {
    const ctx = testExecution();
    const summary = createExecutionSummary({
      ctx,
      results: [createTestResult({ ctx: testCase(ctx), status: 'passed', duration: 1 })],
    });

    expect(Object.keys(summary).sort()).toEqual(
      [
        'counts',
        'duration',
        'endTime',
        'environment',
        'executionId',
        'project',
        'results',
        'startTime',
        'status',
      ].sort(),
    );
    expect(Object.keys(summary.counts).sort()).toEqual(['failed', 'passed', 'skipped', 'total']);
    expect(JSON.stringify(summary)).not.toMatch(/allure/i);
    expect(JSON.stringify(summary)).not.toMatch(/xray/i);
  });
});
