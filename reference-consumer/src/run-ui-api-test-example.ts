import type { ExecutionSummary } from '@qakit/core';
import { runUiTest } from '@qakit/playwright';

export interface RunUiApiTestExampleOptions {
  cwd: string;
  outputDir: string;
  baseUrl: string;
}

/** UI + API setup on one run. Print `summary` after this returns. */
export async function runUiApiTestExample(
  options: RunUiApiTestExampleOptions,
): Promise<ExecutionSummary> {
  return runUiTest(
    'opens blank after ping',
    async ({ page, api }) => {
      if (api === undefined) {
        throw new Error('expected @qakit/api on this run');
      }
      const response = await api.request({ method: 'GET', url: '/ping' });
      if (response.body !== 'pong') {
        throw new Error(`unexpected body: ${response.body}`);
      }
      await page.goto('about:blank');
    },
    {
      cwd: options.cwd,
      env: {},
      api: { saveArtifacts: true },
      overrides: { artifacts: { outputDir: options.outputDir }, baseUrl: options.baseUrl },
    },
  );
}
