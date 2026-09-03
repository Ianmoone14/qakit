import {
  ExecutionError,
  FileSystemArtifactStore,
  LifecycleManager,
  createExecutionContext,
  createExecutionSummary,
  createLoggerFromConfig,
  createTestContext,
  createTestResult,
  loadConfig,
  wrapError,
  type ExecutionSummary,
} from '@qakit/core';

export interface RunExampleOptions {
  cwd: string;
  outputDir: string;
  mode: 'pass' | 'fail';
  artifactSourcePath: string;
  logs: string[];
}

export async function runExample(options: RunExampleOptions): Promise<ExecutionSummary> {
  const config = await loadConfig({
    cwd: options.cwd,
    env: {},
    overrides: { artifacts: { outputDir: options.outputDir } },
  });

  const logger = createLoggerFromConfig(config, {
    write: (line) => {
      options.logs.push(line);
    },
  });

  const store = new FileSystemArtifactStore({
    outputDir: config.artifacts.outputDir,
    cwd: options.cwd,
  });

  const execution = createExecutionContext({
    config,
    logger,
    artifacts: store,
    env: {},
  });
  const log = logger.child({ executionId: execution.executionId });
  log.info('run started', { project: config.project });

  const manager = new LifecycleManager();
  manager.registerExtensions(config.extensions);

  const test = createTestContext(execution, {
    testId: 'example-1',
    testName: options.mode === 'pass' ? 'adds an item' : 'checkout fails',
    testFile: 'example.test.ts',
  });

  const started = Date.now();
  await manager.runBeforeExecution(execution);

  try {
    await manager.runBeforeTest(test);
    await store.save({
      type: 'custom',
      name: 'note.txt',
      path: options.artifactSourcePath,
      executionId: execution.executionId,
      testId: test.testId,
    });
    log.info('artifact saved');

    if (options.mode === 'fail') {
      throw new ExecutionError('checkout failed', { code: 'CHECKOUT_FAILED' });
    }

    const result = createTestResult({
      ctx: test,
      status: 'passed',
      duration: Date.now() - started,
      store,
    });
    await manager.runAfterTest(test, result);
    await manager.runTestCleanup(test);

    const summary = createExecutionSummary({ ctx: execution, results: [result] });
    await manager.runAfterExecution(execution, summary);
    await manager.runCleanup(execution);
    log.info('run finished', { status: summary.status });
    return summary;
  } catch (thrown) {
    const error = wrapError(thrown);
    log.error(error.message, error, { code: error.code });

    const result = createTestResult({
      ctx: test,
      status: 'failed',
      duration: Date.now() - started,
      store,
      error: { message: error.message, code: error.code },
    });
    await manager.runAfterTest(test, result);
    await manager.runTestCleanup(test);

    const summary = createExecutionSummary({ ctx: execution, results: [result] });
    await manager.runAfterExecution(execution, summary);
    await manager.runCleanup(execution);
    return summary;
  }
}
