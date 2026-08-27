import type { ExecutionContext, TestContext } from './execution.js';
import type { ExecutionSummary, TestResult } from './results.js';

export type LifecyclePhase =
  | 'beforeExecution'
  | 'afterExecution'
  | 'beforeTest'
  | 'afterTest'
  | 'cleanup'
  | 'testCleanup';

export interface LifecycleHooks {
  beforeExecution?(ctx: ExecutionContext): Promise<void>;
  afterExecution?(ctx: ExecutionContext, summary: ExecutionSummary): Promise<void>;
  beforeTest?(ctx: TestContext): Promise<void>;
  afterTest?(ctx: TestContext, result: TestResult): Promise<void>;
  cleanup?(ctx: ExecutionContext): Promise<void>;
  testCleanup?(ctx: TestContext): Promise<void>;
}

export interface LifecycleHookOptions {
  /**
   * Lower values run first. Default: 100.
   * Cleanup phases run in reverse order (LIFO).
   */
  priority?: number;
  /**
   * When true, a failure stops the current phase (and the run, for before* phases).
   * Cleanup still runs.
   */
  critical?: boolean;
  /** Timeout in milliseconds. Default: 30000. */
  timeout?: number;
}

export const DEFAULT_HOOK_PRIORITY = 100;
export const DEFAULT_HOOK_TIMEOUT_MS = 30_000;
