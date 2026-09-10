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
import { registerApi, type ApiClient } from '@qakit/api';

export async function runApiSmoke(
  cwd: string,
  outputDir: string,
  baseUrl: string,
): Promise<ExecutionSummary> {
  const config = await loadConfig({
    cwd,
    env: {},
    overrides: { artifacts: { outputDir }, baseUrl },
  });

  const logger = createLoggerFromConfig(config);
  const store = new FileSystemArtifactStore({ outputDir: config.artifacts.outputDir, cwd });
  const execution = createExecutionContext({ config, logger, artifacts: store, env: {} });
  const manager = new LifecycleManager();
  manager.registerExtensions(config.extensions);
  registerApi(manager, { saveArtifacts: true });

  const test = createTestContext(execution, {
    testId: 'api-1',
    testName: 'GET /ping',
    testFile: 'api.test.ts',
  });

  const started = Date.now();
  await manager.runBeforeExecution(execution);

  try {
    await manager.runBeforeTest(test);
    const client = test.services.get<ApiClient>(ServiceKeys.ApiClient);
    const response = await client.request({ method: 'GET', url: '/ping' });
    if (response.body !== 'pong') {
      throw wrapError(new Error(`unexpected body: ${response.body}`));
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
