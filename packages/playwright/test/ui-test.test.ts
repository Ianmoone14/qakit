import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveConfig } from '@qakit/core';
import { afterEach, describe, expect, it } from 'vitest';
import { isChromiumInstalled } from '../src/index.js';
import { runUiTest } from '../src/run-ui-test.js';

const describeBrowser = isChromiumInstalled() ? describe : describe.skip;

describeBrowser('runUiTest', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it(
    'opens about:blank and returns a passed summary',
    async () => {
      const outputDir = await mkdtemp(path.join(tmpdir(), 'qakit-ui-'));
      dirs.push(outputDir);
      const summary = await runUiTest(
        'opens about:blank',
        async ({ page }) => {
          await page.goto('about:blank');
          expect(page.url()).toBe('about:blank');
        },
        {
          api: false,
          env: {},
          cwd: outputDir,
          config: resolveConfig({
            file: { project: 'checkout-api' },
            env: {},
            overrides: { artifacts: { outputDir } },
          }),
        },
      );
      expect(summary.status).toBe('passed');
      expect(summary.results[0]?.testName).toBe('opens about:blank');
    },
    90_000,
  );

  it(
    'can also register an API client on the same run',
    async () => {
      const outputDir = await mkdtemp(path.join(tmpdir(), 'qakit-ui-api-'));
      dirs.push(outputDir);
      const summary = await runUiTest(
        'page and api',
        async ({ page, api }) => {
          expect(api).toBeDefined();
          expect(typeof api?.request).toBe('function');
          await page.goto('about:blank');
        },
        {
          api: true,
          env: {},
          cwd: outputDir,
          config: resolveConfig({
            file: { project: 'checkout-api' },
            env: {},
            overrides: { artifacts: { outputDir } },
          }),
        },
      );
      expect(summary.status).toBe('passed');
    },
    90_000,
  );
});
