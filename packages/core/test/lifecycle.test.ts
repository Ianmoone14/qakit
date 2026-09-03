import { FrameworkError, TimeoutError, type Extension } from '@qakit/contracts';
import { describe, expect, it } from 'vitest';
import {
  LifecycleManager,
  MemoryServiceRegistry,
  createExecutionContext,
  createTestContext,
  resolveConfig,
} from '../src/index.js';
import { emptySummary, memoryArtifacts, passedResult, silentLogger, testCase, testExecution } from './helpers.js';

describe('LifecycleManager', () => {
  it('runs same-priority hooks in registration order', async () => {
    const order: string[] = [];
    const manager = new LifecycleManager();
    manager.registerHook('beforeExecution', async () => {
      order.push('a');
    }, { name: 'a' });
    manager.registerHook('beforeExecution', async () => {
      order.push('b');
    }, { name: 'b' });

    await manager.runBeforeExecution(testExecution());
    expect(order).toEqual(['a', 'b']);
  });

  it('runs lower priority first', async () => {
    const order: string[] = [];
    const manager = new LifecycleManager();
    manager.registerHook(
      'beforeExecution',
      async () => {
        order.push('late');
      },
      { name: 'late', priority: 200 },
    );
    manager.registerHook(
      'beforeExecution',
      async () => {
        order.push('early');
      },
      { name: 'early', priority: 10 },
    );

    await manager.runBeforeExecution(testExecution());
    expect(order).toEqual(['early', 'late']);
  });

  it('runs cleanup LIFO (reverse of priority + registration)', async () => {
    const order: string[] = [];
    const manager = new LifecycleManager();
    manager.registerHook(
      'cleanup',
      async () => {
        order.push('first');
      },
      { name: 'first', priority: 10 },
    );
    manager.registerHook(
      'cleanup',
      async () => {
        order.push('second');
      },
      { name: 'second', priority: 100 },
    );

    await manager.runCleanup(testExecution());
    expect(order).toEqual(['second', 'first']);
  });

  it('continues the phase after a non-critical failure', async () => {
    const order: string[] = [];
    const manager = new LifecycleManager();
    manager.registerHook(
      'beforeExecution',
      async () => {
        order.push('fail');
        throw new Error('non-critical');
      },
      { name: 'fail', critical: false },
    );
    manager.registerHook(
      'beforeExecution',
      async () => {
        order.push('next');
      },
      { name: 'next' },
    );

    await manager.runBeforeExecution(testExecution());
    expect(order).toEqual(['fail', 'next']);
  });

  it('stops before* when a critical hook fails', async () => {
    const order: string[] = [];
    const manager = new LifecycleManager();
    manager.registerHook(
      'beforeTest',
      async () => {
        order.push('critical');
        throw new Error('boom');
      },
      { name: 'critical', critical: true },
    );
    manager.registerHook(
      'beforeTest',
      async () => {
        order.push('skipped');
      },
      { name: 'skipped' },
    );

    const ctx = testCase(testExecution());
    await expect(manager.runBeforeTest(ctx)).rejects.toThrow('boom');
    expect(order).toEqual(['critical']);
  });

  it('still runs remaining cleanup hooks after a failure, then throws', async () => {
    const order: string[] = [];
    const manager = new LifecycleManager();
    manager.registerHook(
      'cleanup',
      async () => {
        order.push('first-registered');
      },
      { name: 'ok' },
    );
    manager.registerHook(
      'cleanup',
      async () => {
        order.push('second-registered');
        throw new Error('cleanup failed');
      },
      { name: 'fail' },
    );

    await expect(manager.runCleanup(testExecution())).rejects.toThrow('cleanup failed');
    expect(order).toEqual(['second-registered', 'first-registered']);
  });

  it('throws TimeoutError when a hook exceeds timeout', async () => {
    const manager = new LifecycleManager();
    manager.registerHook(
      'beforeExecution',
      async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 200);
        });
      },
      { name: 'slow', timeout: 20, critical: true },
    );

    await expect(manager.runBeforeExecution(testExecution())).rejects.toBeInstanceOf(TimeoutError);
  });

  it('registers extension hooks from config and can attach a service in beforeTest', async () => {
    const fixture: Extension = {
      name: 'auth-fixture',
      version: '1.0.0',
      hooks: {
        async beforeTest(ctx) {
          ctx.services.register('qakit.auth', { token: 'secret' });
        },
      },
    };

    const config = resolveConfig({
      file: { project: 'checkout-api', extensions: [fixture] },
      env: {},
    });
    const execution = createExecutionContext({
      config,
      logger: silentLogger(),
      artifacts: memoryArtifacts(),
      env: {},
    });
    const test = createTestContext(execution, {
      testId: 't1',
      testName: 'uses auth',
      testFile: 'auth.test.ts',
    });

    const manager = new LifecycleManager();
    manager.registerExtensions(config.extensions);
    await manager.runBeforeTest(test);

    expect(test.services.get<{ token: string }>('qakit.auth')).toEqual({ token: 'secret' });
  });

  it('runs afterTest with the test result', async () => {
    const seen: string[] = [];
    const manager = new LifecycleManager();
    manager.registerHook('afterTest', async (_ctx, extra) => {
      seen.push((extra as { status: string }).status);
    });

    const ctx = testCase(testExecution());
    await manager.runAfterTest(ctx, passedResult(ctx));
    expect(seen).toEqual(['passed']);
  });

  it('runs afterExecution with the summary', async () => {
    const seen: string[] = [];
    const manager = new LifecycleManager();
    manager.registerHook('afterExecution', async (_ctx, extra) => {
      seen.push((extra as { executionId: string }).executionId);
    });

    const ctx = testExecution();
    await manager.runAfterExecution(ctx, emptySummary(ctx));
    expect(seen).toEqual([ctx.executionId]);
  });
});

describe('MemoryServiceRegistry', () => {
  it('register / has / get / tryGet and throws when missing', () => {
    const services = new MemoryServiceRegistry();
    expect(services.has('qakit.auth')).toBe(false);
    expect(services.tryGet('qakit.auth')).toBeUndefined();
    expect(() => services.get('qakit.auth')).toThrow(FrameworkError);

    services.register('qakit.auth', { token: 't' });
    expect(services.has('qakit.auth')).toBe(true);
    expect(services.get('qakit.auth')).toEqual({ token: 't' });
  });
});
