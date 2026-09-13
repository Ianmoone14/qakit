import { it } from 'vitest';
import { runApiTest, type ApiTestFixtures, type RunApiTestOptions } from './run-api-test.js';

export type { ApiTestFixtures, RunApiTestOptions } from './run-api-test.js';
export { runApiTest } from './run-api-test.js';

export interface ApiTestOptions extends RunApiTestOptions {
  timeout?: number;
}

/**
 * Vitest `it()` wrapper. Fails the Vitest case when the QAKit run fails.
 * For `ExecutionSummary` (print / assert), call `runApiTest` instead.
 */
export function apiTest(
  name: string,
  fn: (fixtures: ApiTestFixtures) => Promise<void>,
  options?: ApiTestOptions,
): void {
  const timeout = options?.timeout ?? 30_000;
  it(
    name,
    async () => {
      await runApiTest(name, fn, { ...withoutTimeout(options), throwOnFailure: true });
    },
    timeout,
  );
}

function withoutTimeout(options: ApiTestOptions | undefined): RunApiTestOptions {
  if (options === undefined) {
    return {};
  }
  const { timeout, ...rest } = options;
  return timeout === undefined ? rest : rest;
}
