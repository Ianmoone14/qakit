import type { ExecutionSummary } from '@qakit/core';
import { runApiTest } from '@qakit/api';

export interface RunApiTestExampleOptions {
  cwd: string;
  outputDir: string;
  baseUrl: string;
}

/** Same run as `run-api-example.ts`, through the driver. */
export async function runApiTestExample(
  options: RunApiTestExampleOptions,
): Promise<ExecutionSummary> {
  return runApiTest(
    'GET /ping',
    async ({ api }) => {
      const response = await api.request({ method: 'GET', url: '/ping' });
      if (response.body !== 'pong') {
        throw new Error(`unexpected body: ${response.body}`);
      }
    },
    {
      cwd: options.cwd,
      env: {},
      saveArtifacts: true,
      overrides: { artifacts: { outputDir: options.outputDir }, baseUrl: options.baseUrl },
    },
  );
}
