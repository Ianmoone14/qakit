import type {
  ExecutionContext,
  Extension,
  LifecycleHookOptions,
  LifecyclePhase,
  TestContext,
} from '@qakit/contracts';
import {
  DEFAULT_HOOK_PRIORITY,
  DEFAULT_HOOK_TIMEOUT_MS,
  ExecutionError,
  TimeoutError,
} from '@qakit/contracts';
import type { ExecutionSummary, TestResult } from '@qakit/contracts';

type HookHandler = (ctx: ExecutionContext | TestContext, extra?: unknown) => Promise<void>;

interface RegisteredHook {
  phase: LifecyclePhase;
  handler: HookHandler;
  options: {
    priority: number;
    critical: boolean;
    timeout: number;
  };
  source: string;
}

const CLEANUP_PHASES: ReadonlySet<LifecyclePhase> = new Set(['cleanup', 'testCleanup']);

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, source: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new TimeoutError(`Lifecycle hook '${source}' timed out after ${timeoutMs}ms`, {
          code: 'HOOK_TIMEOUT',
          context: { source, timeoutMs },
        }),
      );
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export class LifecycleManager {
  readonly #hooks: RegisteredHook[] = [];

  register(phase: LifecyclePhase, handler: HookHandler, options: LifecycleHookOptions = {}): void {
    this.#hooks.push({
      phase,
      handler,
      options: {
        priority: options.priority ?? DEFAULT_HOOK_PRIORITY,
        critical: options.critical ?? false,
        timeout: options.timeout ?? DEFAULT_HOOK_TIMEOUT_MS,
      },
      source: `hook:${phase}`,
    });
  }

  registerExtension(extension: Extension): void {
    const hooks = extension.hooks;
    if (hooks === undefined) {
      return;
    }
    if (hooks.beforeExecution) {
      this.register('beforeExecution', (ctx) => hooks.beforeExecution!(ctx as ExecutionContext), {
        critical: true,
      });
    }
    if (hooks.afterExecution) {
      this.register('afterExecution', (ctx, extra) =>
        hooks.afterExecution!(ctx as ExecutionContext, extra as ExecutionSummary),
      );
    }
    if (hooks.beforeTest) {
      this.register('beforeTest', (ctx) => hooks.beforeTest!(ctx as TestContext), { critical: true });
    }
    if (hooks.afterTest) {
      this.register('afterTest', (ctx, extra) =>
        hooks.afterTest!(ctx as TestContext, extra as TestResult),
      );
    }
    if (hooks.cleanup) {
      this.register('cleanup', (ctx) => hooks.cleanup!(ctx as ExecutionContext));
    }
    if (hooks.testCleanup) {
      this.register('testCleanup', (ctx) => hooks.testCleanup!(ctx as TestContext));
    }
  }

  async execute(
    phase: LifecyclePhase,
    ctx: ExecutionContext | TestContext,
    extra?: unknown,
  ): Promise<void> {
    const selected = this.#hooks.filter((hook) => hook.phase === phase);
    selected.sort((a, b) => a.options.priority - b.options.priority);
    if (CLEANUP_PHASES.has(phase)) {
      selected.reverse();
    }

    const failures: Error[] = [];

    for (const hook of selected) {
      try {
        await withTimeout(hook.handler(ctx, extra), hook.options.timeout, hook.source);
      } catch (error) {
        const normalized = toError(error);
        ctx.logger.warn(`Lifecycle hook failed during ${phase}`, {
          phase,
          source: hook.source,
          critical: hook.options.critical,
          error: normalized.message,
        });
        if (hook.options.critical && !CLEANUP_PHASES.has(phase)) {
          throw new ExecutionError(`Critical lifecycle hook failed during ${phase}`, {
            code: 'CRITICAL_HOOK_FAILED',
            context: { phase, source: hook.source },
            cause: normalized,
          });
        }
        failures.push(normalized);
      }
    }

    const criticalCleanupFailure = CLEANUP_PHASES.has(phase)
      ? selected.some((hook) => hook.options.critical) && failures.length > 0
      : false;

    if (criticalCleanupFailure) {
      throw new ExecutionError(`Critical cleanup hook failed during ${phase}`, {
        code: 'CRITICAL_CLEANUP_FAILED',
        context: { phase, failureCount: failures.length },
        cause: failures[0],
      });
    }
  }
}

export function createLifecycleManager(extensions: Extension[] = []): LifecycleManager {
  const manager = new LifecycleManager();
  for (const extension of extensions) {
    manager.registerExtension(extension);
  }
  return manager;
}
