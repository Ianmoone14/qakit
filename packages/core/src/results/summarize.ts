import type { ExecutionContext, ExecutionSummary, TestResult } from '@qakit/contracts';

export function summarizeExecution(
  ctx: ExecutionContext,
  results: TestResult[],
  endTime: Date = new Date(),
): ExecutionSummary {
  const passed = results.filter((result) => result.status === 'passed').length;
  const failed = results.filter(
    (result) => result.status === 'failed' || result.status === 'timedOut',
  ).length;
  const skipped = results.filter((result) => result.status === 'skipped').length;

  return {
    executionId: ctx.executionId,
    project: ctx.project,
    environment: ctx.environment,
    status: failed > 0 ? 'failed' : 'passed',
    startTime: ctx.startTime,
    endTime,
    duration: endTime.getTime() - ctx.startTime.getTime(),
    counts: {
      total: results.length,
      passed,
      failed,
      skipped,
    },
    results,
  };
}
