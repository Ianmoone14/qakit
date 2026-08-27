import { describe, expect, it } from 'vitest';
import { FrameworkError } from '@qakit/contracts';
import { resolveConfig } from '../src/config/resolve.js';
import { createExecutionContext } from '../src/context/execution.js';
import { InMemoryServiceRegistry } from '../src/services/registry.js';
import { summarizeExecution } from '../src/results/summarize.js';

describe('InMemoryServiceRegistry', () => {
  it('registers, retrieves, and throws on missing services', () => {
    const registry = new InMemoryServiceRegistry();
    registry.register('qakit.auth', { name: 'stub' });
    expect(registry.get<{ name: string }>('qakit.auth').name).toBe('stub');
    expect(registry.tryGet('missing')).toBeUndefined();
    expect(() => registry.get('missing')).toThrow(FrameworkError);
  });
});

describe('summarizeExecution', () => {
  it('marks the run failed when any test failed or timed out', () => {
    const ctx = createExecutionContext({
      config: resolveConfig({
        loaded: { project: 'sum-project' },
        env: {},
        overrides: { logging: { level: 'error', format: 'json' } },
      }),
      env: {},
    });
    const summary = summarizeExecution(ctx, [
      {
        testId: '1',
        testName: 'ok',
        testFile: 'a.ts',
        status: 'passed',
        duration: 10,
        attempt: 1,
        artifacts: [],
        tags: [],
      },
      {
        testId: '2',
        testName: 'bad',
        testFile: 'a.ts',
        status: 'timedOut',
        duration: 5,
        attempt: 1,
        artifacts: [],
        tags: [],
      },
    ]);
    expect(summary.status).toBe('failed');
    expect(summary.counts).toEqual({ total: 2, passed: 1, failed: 1, skipped: 0 });
  });
});
