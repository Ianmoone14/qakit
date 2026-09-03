import type {
  Artifact,
  ArtifactStore,
  ExecutionContext,
  ExecutionStatus,
  ExecutionSummary,
  TestContext,
  TestError,
  TestResult,
  TestStatus,
} from '@qakit/contracts';

export interface CreateTestResultOptions {
  ctx: TestContext;
  status: TestStatus;
  duration: number;
  error?: TestError;
  /** Explicit list. If omitted and `store` is set, uses `store.getByTest(ctx.testId)`. */
  artifacts?: Artifact[];
  store?: ArtifactStore;
}

export interface CreateExecutionSummaryOptions {
  ctx: ExecutionContext;
  results: TestResult[];
  /** Explicit run status. If omitted: `failed` when any test failed or timed out, otherwise `passed`. */
  status?: ExecutionStatus;
  endTime?: Date;
}

export function createTestResult(options: CreateTestResultOptions): TestResult {
  const artifacts =
    options.artifacts !== undefined
      ? [...options.artifacts]
      : options.store !== undefined
        ? options.store.getByTest(options.ctx.testId)
        : [];

  const result: TestResult = {
    testId: options.ctx.testId,
    testName: options.ctx.testName,
    testFile: options.ctx.testFile,
    status: options.status,
    duration: options.duration,
    attempt: options.ctx.attempt,
    artifacts,
    tags: [...options.ctx.tags],
  };

  if (options.error !== undefined) {
    result.error = options.error;
  }

  return result;
}

export function createExecutionSummary(options: CreateExecutionSummaryOptions): ExecutionSummary {
  const endTime = options.endTime ?? new Date();
  const counts = {
    total: options.results.length,
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  for (const result of options.results) {
    if (result.status === 'passed') {
      counts.passed += 1;
    } else if (result.status === 'skipped') {
      counts.skipped += 1;
    } else {
      counts.failed += 1;
    }
  }

  const status =
    options.status ??
    (options.results.some((result) => result.status === 'failed' || result.status === 'timedOut')
      ? 'failed'
      : 'passed');

  return {
    executionId: options.ctx.executionId,
    project: options.ctx.project,
    environment: options.ctx.environment,
    status,
    startTime: options.ctx.startTime,
    endTime,
    duration: Math.max(0, endTime.getTime() - options.ctx.startTime.getTime()),
    counts,
    results: [...options.results],
  };
}
