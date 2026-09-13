import { it } from 'vitest';
import { runUiTest, type RunUiTestOptions, type UiTestFixtures } from './run-ui-test.js';

export type { RunUiTestOptions, UiApiClient, UiTestApiOption, UiTestFixtures } from './run-ui-test.js';
export { runUiTest } from './run-ui-test.js';

export interface UiTestOptions extends RunUiTestOptions {
  timeout?: number;
}

/**
 * Vitest `it()` wrapper. Fails the Vitest case when the QAKit run fails.
 * For `ExecutionSummary` (print / assert), call `runUiTest` instead.
 */
export function uiTest<TApi = import('./run-ui-test.js').UiApiClient>(
  name: string,
  fn: (fixtures: UiTestFixtures<TApi>) => Promise<void>,
  options?: UiTestOptions,
): void {
  const timeout = options?.timeout ?? 90_000;
  it(
    name,
    async () => {
      await runUiTest(name, fn, { ...withoutTimeout(options), throwOnFailure: true });
    },
    timeout,
  );
}

function withoutTimeout(options: UiTestOptions | undefined): RunUiTestOptions {
  if (options === undefined) {
    return {};
  }
  const { timeout, ...rest } = options;
  return timeout === undefined ? rest : rest;
}
