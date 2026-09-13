import type { ExecutionSummary } from '@qakit/core';
import { runUiTest } from '@qakit/playwright';

export interface RunUiTestExampleOptions {
  cwd: string;
  outputDir: string;
}

/** Same run as `run-playwright-example.ts`, through the driver. */
export async function runUiTestExample(
  options: RunUiTestExampleOptions,
): Promise<ExecutionSummary> {
  return runUiTest(
    'opens about:blank',
    async ({ page }) => {
      await page.goto('about:blank');
    },
    {
      cwd: options.cwd,
      env: {},
      api: false,
      overrides: { artifacts: { outputDir: options.outputDir } },
    },
  );
}
