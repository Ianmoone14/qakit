import type { ExecutionContext, TestContext, TestInfo } from '@qakit/contracts';

export function createTestContext(execution: ExecutionContext, testInfo: TestInfo): TestContext {
  return {
    ...execution,
    testId: testInfo.testId,
    testName: testInfo.testName,
    testFile: testInfo.testFile,
    attempt: testInfo.attempt ?? 1,
    tags: testInfo.tags ?? [],
    logger: execution.logger.child({
      testId: testInfo.testId,
      testName: testInfo.testName,
    }),
  };
}
