import {
  DEFAULT_HOOK_PRIORITY,
  DEFAULT_HOOK_TIMEOUT_MS,
  TimeoutError,
  type ExecutionContext,
  type ExecutionSummary,
  type Extension,
  type LifecycleHookOptions,
  type LifecyclePhase,
  type TestContext,
  type TestResult,
} from '@qakit/contracts';

export interface RegisterHookOptions extends LifecycleHookOptions {
  /** Extension or caller name, used in timeout/error context. */
  name?: string;
}

interface RegisteredHook {
  id: number;
  name: string;
  phase: LifecyclePhase;
  priority: number;
  critical: boolean;
  timeoutMs: number;
  run: (ctx: ExecutionContext | TestContext, extra?: ExecutionSummary | TestResult) => Promise<void>;
}

const CLEANUP_PHASES: ReadonlySet<LifecyclePhase> = new Set(['cleanup', 'testCleanup']);

function resolveOptions(options: RegisterHookOptions | undefined): {
  name: string;
  priority: number;
  critical: boolean;
  timeoutMs: number;
} {
  const timeout = options?.timeout;
  return {
    name: options?.name ?? 'anonymous',
    priority: options?.priority ?? DEFAULT_HOOK_PRIORITY,
    critical: options?.critical === true,
    timeoutMs: timeout !== undefined && timeout > 0 ? timeout : DEFAULT_HOOK_TIMEOUT_MS,
  };
}

async function withTimeout(
  work: Promise<void>,
  timeoutMs: number,
  meta: { phase: LifecyclePhase; name: string },
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new TimeoutError(`Hook "${meta.name}" timed out in ${meta.phase} after ${String(timeoutMs)}ms`, {
          code: 'HOOK_TIMEOUT',
          context: { phase: meta.phase, name: meta.name, timeoutMs },
        }),
      );
    }, timeoutMs);
  });

  try {
    await Promise.race([work, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export class LifecycleManager {
  #nextId = 0;
  readonly #hooks: RegisteredHook[] = [];

  registerHook(
    phase: LifecyclePhase,
    run: RegisteredHook['run'],
    options?: RegisterHookOptions,
  ): void {
    const resolved = resolveOptions(options);
    this.#hooks.push({
      id: this.#nextId,
      name: resolved.name,
      phase,
      priority: resolved.priority,
      critical: resolved.critical,
      timeoutMs: resolved.timeoutMs,
      run,
    });
    this.#nextId += 1;
  }

  registerExtension(
    extension: Extension,
    hookOptions?: Partial<Record<LifecyclePhase, LifecycleHookOptions>>,
  ): void {
    const hooks = extension.hooks;
    if (hooks === undefined) {
      return;
    }

    const optsFor = (phase: LifecyclePhase): RegisterHookOptions => {
      const phaseOpts = hookOptions?.[phase];
      const base: RegisterHookOptions = { name: extension.name };
      if (phaseOpts?.priority !== undefined) {
        base.priority = phaseOpts.priority;
      }
      if (phaseOpts?.critical !== undefined) {
        base.critical = phaseOpts.critical;
      }
      if (phaseOpts?.timeout !== undefined) {
        base.timeout = phaseOpts.timeout;
      }
      return base;
    };

    if (hooks.beforeExecution !== undefined) {
      const fn = hooks.beforeExecution;
      this.registerHook('beforeExecution', (ctx) => fn(ctx as ExecutionContext), optsFor('beforeExecution'));
    }
    if (hooks.afterExecution !== undefined) {
      const fn = hooks.afterExecution;
      this.registerHook(
        'afterExecution',
        (ctx, extra) => fn(ctx as ExecutionContext, extra as ExecutionSummary),
        optsFor('afterExecution'),
      );
    }
    if (hooks.beforeTest !== undefined) {
      const fn = hooks.beforeTest;
      this.registerHook('beforeTest', (ctx) => fn(ctx as TestContext), optsFor('beforeTest'));
    }
    if (hooks.afterTest !== undefined) {
      const fn = hooks.afterTest;
      this.registerHook(
        'afterTest',
        (ctx, extra) => fn(ctx as TestContext, extra as TestResult),
        optsFor('afterTest'),
      );
    }
    if (hooks.cleanup !== undefined) {
      const fn = hooks.cleanup;
      this.registerHook('cleanup', (ctx) => fn(ctx as ExecutionContext), optsFor('cleanup'));
    }
    if (hooks.testCleanup !== undefined) {
      const fn = hooks.testCleanup;
      this.registerHook('testCleanup', (ctx) => fn(ctx as TestContext), optsFor('testCleanup'));
    }
  }

  registerExtensions(extensions: readonly Extension[]): void {
    for (const extension of extensions) {
      this.registerExtension(extension);
    }
  }

  async runBeforeExecution(ctx: ExecutionContext): Promise<void> {
    await this.#run('beforeExecution', ctx);
  }

  async runAfterExecution(ctx: ExecutionContext, summary: ExecutionSummary): Promise<void> {
    await this.#run('afterExecution', ctx, summary);
  }

  async runBeforeTest(ctx: TestContext): Promise<void> {
    await this.#run('beforeTest', ctx);
  }

  async runAfterTest(ctx: TestContext, result: TestResult): Promise<void> {
    await this.#run('afterTest', ctx, result);
  }

  async runCleanup(ctx: ExecutionContext): Promise<void> {
    await this.#run('cleanup', ctx);
  }

  async runTestCleanup(ctx: TestContext): Promise<void> {
    await this.#run('testCleanup', ctx);
  }

  async #run(
    phase: LifecyclePhase,
    ctx: ExecutionContext | TestContext,
    extra?: ExecutionSummary | TestResult,
  ): Promise<void> {
    const isCleanup = CLEANUP_PHASES.has(phase);
    const hooks = this.#hooks.filter((hook) => hook.phase === phase);
    hooks.sort((a, b) => a.priority - b.priority || a.id - b.id);
    if (isCleanup) {
      hooks.reverse();
    }

    const cleanupErrors: unknown[] = [];

    for (const hook of hooks) {
      try {
        const work = extra !== undefined ? hook.run(ctx, extra) : hook.run(ctx);
        await withTimeout(work, hook.timeoutMs, { phase, name: hook.name });
      } catch (error) {
        if (isCleanup) {
          cleanupErrors.push(error);
          continue;
        }
        if (hook.critical) {
          throw error;
        }
      }
    }

    const firstCleanupError = cleanupErrors[0];
    if (firstCleanupError !== undefined) {
      throw firstCleanupError;
    }
  }
}
