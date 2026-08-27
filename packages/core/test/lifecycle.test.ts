import { describe, expect, it } from 'vitest';
import { ExecutionError, TimeoutError } from '@qakit/contracts';
import type { ExecutionContext } from '@qakit/contracts';
import { resolveConfig } from '../src/config/resolve.js';
import { createExecutionContext } from '../src/context/execution.js';
import { LifecycleManager } from '../src/lifecycle/manager.js';

function ctx(): ExecutionContext {
  return createExecutionContext({
    config: resolveConfig({
      loaded: { project: 'lifecycle-project' },
      env: {},
      overrides: { logging: { level: 'error', format: 'json' } },
    }),
    env: {},
  });
}

describe('LifecycleManager', () => {
  it('runs hooks in priority order (lower first)', async () => {
    const order: number[] = [];
    const manager = new LifecycleManager();
    manager.register('beforeExecution', async () => {
      order.push(2);
    }, { priority: 200 });
    manager.register('beforeExecution', async () => {
      order.push(1);
    }, { priority: 50 });
    await manager.execute('beforeExecution', ctx());
    expect(order).toEqual([1, 2]);
  });

  it('continues after a non-critical failure', async () => {
    const ran: string[] = [];
    const manager = new LifecycleManager();
    manager.register('beforeTest', async () => {
      throw new Error('soft fail');
    }, { critical: false });
    manager.register('beforeTest', async () => {
      ran.push('ok');
    });
    await manager.execute('beforeTest', ctx());
    expect(ran).toEqual(['ok']);
  });

  it('stops on a critical failure', async () => {
    const manager = new LifecycleManager();
    manager.register('beforeExecution', async () => {
      throw new Error('boom');
    }, { critical: true, priority: 1 });
    manager.register('beforeExecution', async () => {
      throw new Error('should not run');
    }, { priority: 2 });
    await expect(manager.execute('beforeExecution', ctx())).rejects.toBeInstanceOf(ExecutionError);
  });

  it('always runs cleanup in reverse priority', async () => {
    const order: string[] = [];
    const manager = new LifecycleManager();
    manager.register('cleanup', async () => {
      order.push('a');
    }, { priority: 10 });
    manager.register('cleanup', async () => {
      order.push('b');
    }, { priority: 20 });
    manager.register('beforeExecution', async () => {
      throw new Error('fail');
    }, { critical: true });
    await expect(manager.execute('beforeExecution', ctx())).rejects.toBeInstanceOf(ExecutionError);
    await manager.execute('cleanup', ctx());
    expect(order).toEqual(['b', 'a']);
  });

  it('times out a hung hook', async () => {
    const manager = new LifecycleManager();
    manager.register(
      'beforeTest',
      async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 1000);
        });
      },
      { timeout: 20, critical: true },
    );
    await expect(manager.execute('beforeTest', ctx())).rejects.toSatisfy(
      (error: unknown) => error instanceof ExecutionError && error.cause instanceof TimeoutError,
    );
  });
});
