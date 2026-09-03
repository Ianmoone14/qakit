import type {
  Artifact,
  ArtifactInput,
  ArtifactStore,
  ExecutionContext,
  ExecutionSummary,
  Logger,
  TestContext,
  TestResult,
} from '@qakit/contracts';
import { createExecutionContext, createTestContext, resolveConfig } from '../src/index.js';

export function silentLogger(): Logger {
  const logger: Logger = {
    debug() {},
    info() {},
    warn() {},
    error() {},
    child() {
      return logger;
    },
  };
  return logger;
}

export function memoryArtifacts(): ArtifactStore {
  const items: Artifact[] = [];
  return {
    async save(input: ArtifactInput): Promise<Artifact> {
      const artifact: Artifact = {
        ...input,
        id: `artifact-${String(items.length + 1)}`,
        timestamp: new Date(),
      };
      items.push(artifact);
      return artifact;
    },
    getAll() {
      return [...items];
    },
    getByTest(testId: string) {
      return items.filter((item) => item.testId === testId);
    },
  };
}

export function testExecution(env: Record<string, string | undefined> = {}): ExecutionContext {
  return createExecutionContext({
    config: resolveConfig({ file: { project: 'checkout-api' }, env }),
    logger: silentLogger(),
    artifacts: memoryArtifacts(),
    env,
  });
}

export function testCase(execution: ExecutionContext): TestContext {
  return createTestContext(execution, {
    testId: 't1',
    testName: 'sample',
    testFile: 'sample.test.ts',
  });
}

export function passedResult(ctx: TestContext): TestResult {
  return {
    testId: ctx.testId,
    testName: ctx.testName,
    testFile: ctx.testFile,
    status: 'passed',
    duration: 1,
    attempt: ctx.attempt,
    artifacts: [],
    tags: [...ctx.tags],
  };
}

export function emptySummary(ctx: ExecutionContext): ExecutionSummary {
  return {
    executionId: ctx.executionId,
    project: ctx.project,
    environment: ctx.environment,
    status: 'passed',
    startTime: ctx.startTime,
    endTime: ctx.startTime,
    duration: 0,
    counts: { total: 0, passed: 0, failed: 0, skipped: 0 },
    results: [],
  };
}

