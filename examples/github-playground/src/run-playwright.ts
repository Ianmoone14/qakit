import {
  FileSystemArtifactStore,
  LifecycleManager,
  ServiceKeys,
  createExecutionContext,
  createExecutionSummary,
  createLoggerFromConfig,
  createTestContext,
  createTestResult,
  loadConfig,
  wrapError,
  type ExecutionSummary,
} from '@qakit/core';
import { registerPlaywright, type Page } from '@qakit/playwright';

export async function runPlaywrightSmoke(cwd: string, outputDir: string): Promise<ExecutionSummary> {
  const config = await loadConfig({
    cwd,
    env: {},
    overrides: { artifacts: { outputDir } },
  });

  const logger = createLoggerFromConfig(config);
  const store = new FileSystemArtifactStore({ outputDir: config.artifacts.outputDir, cwd });
  const execution = createExecutionContext({ config, logger, artifacts: store, env: {} });
  const manager = new LifecycleManager();
  manager.registerExtensions(config.extensions);
  registerPlaywright(manager, { headless: true });

  const test = createTestContext(execution, {
    testId: 'pw-1',
    testName: 'opens about:blank',
    testFile: 'playwright.test.ts',
  });

  const started = Date.now();
  await manager.runBeforeExecution(execution);

  try {
    await manager.runBeforeTest(test);
    const page = test.services.get<Page>(ServiceKeys.PlaywrightPage);
    await page.goto('about:blank');
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
    return summary;
  } catch (thrown) {
    const error = wrapError(thrown);
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
