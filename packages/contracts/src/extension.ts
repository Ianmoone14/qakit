import type { ExecutionContext } from './execution.js';
import type { LifecycleHooks } from './lifecycle.js';
import type { ExecutionSummary, TestResult } from './results.js';

export interface Extension {
  name: string;
  version: string;
  dependencies?: string[];
  hooks?: LifecycleHooks;
}

export interface AuthProvider {
  name: string;
  getHeaders(ctx: ExecutionContext): Promise<Record<string, string>>;
}

export interface Reporter {
  name: string;
  onTestResult(result: TestResult): Promise<void>;
  onExecutionComplete(summary: ExecutionSummary): Promise<void>;
}
