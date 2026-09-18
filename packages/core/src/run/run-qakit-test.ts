import { ulid } from 'ulid';
import type {
  ExecutionSummary,
  ResolvedConfig,
  TestContext,
  TestError,
  TestInfo,
  TestResult,
} from '@qakit/contracts';
import { FileSystemArtifactStore } from '../artifacts/file-system-artifact-store.js';
import type { ConfigLayer, EnvMap } from '../config/types.js';
import { loadConfig } from '../config/load-config.js';
import { createExecutionContext, createTestContext } from '../context/create-context.js';
import { LifecycleManager } from '../lifecycle/lifecycle-manager.js';
import { createLoggerFromConfig } from '../logging/create-logger.js';
import { wrapError } from '../logging/wrap-error.js';
import { createExecutionSummary, createTestResult } from '../results/create-result.js';

export interface RunQakitTestOptions {
  name: string;
  run: (ctx: TestContext) => Promise<void>;
  /**
   * Register adapters after `config.extensions`.
   * Core never imports Playwright, API, or reporters here.
   */
  register?: (manager: LifecycleManager, config: ResolvedConfig) => void | Promise<void>;
  /** Already-resolved config. If omitted, loads `qakit.config.ts` from `cwd`. */
  config?: ResolvedConfig;
  cwd?: string;
  env?: EnvMap;
  overrides?: ConfigLayer;
  testId?: string;
  testFile?: string;
  tags?: string[];
  attempt?: number;
  /**
   * Re-throw the original error after cleanup.
   * Default false — returns the summary (same as the long consumer examples).
   */
  throwOnFailure?: boolean;
}

function toTestError(error: unknown): TestError {
  const wrapped = wrapError(error);
  const testError: TestError = {
    message: wrapped.message,
    code: wrapped.code,
  };
  if (typeof wrapped.stack === 'string') {
    testError.stack = wrapped.stack;
  }
  return testError;
}

/**
 * One test = one execution: load config, run all six lifecycle phases, return a summary.
 * Adapters attach resources in `register`. This function has no Playwright or HTTP types.
 */
export async function runQakitTest(options: RunQakitTestOptions): Promise<ExecutionSummary> {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? {};
  const config =
    options.config ??
    (await loadConfig({
      cwd,
      env,
      ...(options.overrides !== undefined ? { overrides: options.overrides } : {}),
    }));

  const executionId = ulid();
  const logger = createLoggerFromConfig(config, {
    context: {
      executionId,
      project: config.project,
      environment: config.environment,
    },
  });
  const store = new FileSystemArtifactStore({
    outputDir: config.artifacts.outputDir,
    cwd,
  });
  const execution = createExecutionContext({
    config,
    logger,
    artifacts: store,
    env,
    executionId,
  });

  const manager = new LifecycleManager();
  manager.registerExtensions(config.extensions);
  if (options.register !== undefined) {
    await options.register(manager, config);
  }

  const testInfo: TestInfo = {
    testId: options.testId ?? ulid(),
    testName: options.name,
    testFile: options.testFile ?? 'qakit.test.ts',
  };
  if (options.attempt !== undefined) {
    testInfo.attempt = options.attempt;
  }
  if (options.tags !== undefined) {
    testInfo.tags = options.tags;
  }
  const test = createTestContext(execution, testInfo);

  const started = Date.now();
  let result: TestResult | undefined;
  let thrown: unknown;

  test.logger.info('test started', { testName: test.testName, testFile: test.testFile });

  try {
    test.logger.debug('phase beforeExecution');
    await manager.runBeforeExecution(execution);
    test.logger.debug('phase beforeTest');
    await manager.runBeforeTest(test);
    await options.run(test);
    result = createTestResult({
      ctx: test,
      status: 'passed',
      duration: Date.now() - started,
      store,
    });
  } catch (error) {
    thrown = error;
    result = createTestResult({
      ctx: test,
      status: 'failed',
      duration: Date.now() - started,
      store,
      error: toTestError(error),
    });
  }

  try {
    test.logger.debug('phase afterTest');
    await manager.runAfterTest(test, result);
  } catch (error) {
    thrown ??= error;
  }

  try {
    test.logger.debug('phase testCleanup');
    await manager.runTestCleanup(test);
  } catch (error) {
    thrown ??= error;
  }

  const summary = createExecutionSummary({ ctx: execution, results: [result] });

  try {
    test.logger.debug('phase afterExecution');
    await manager.runAfterExecution(execution, summary);
  } catch (error) {
    thrown ??= error;
  }

  try {
    test.logger.debug('phase cleanup');
    await manager.runCleanup(execution);
  } catch (error) {
    thrown ??= error;
  }

  test.logger.info('test finished', {
    status: result.status,
    duration: result.duration,
  });
  if (result.error !== undefined) {
    test.logger.error('test failed', wrapError(thrown), {
      code: result.error.code,
    });
  }

  if (options.throwOnFailure === true && thrown !== undefined) {
    throw thrown;
  }
  return summary;
}
