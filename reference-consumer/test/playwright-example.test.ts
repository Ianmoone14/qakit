import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { ServiceKeys } from '@qakit/core';
import { isChromiumInstalled } from '@qakit/playwright';
import { runPlaywrightExample } from '../src/run-playwright-example.js';

const consumerRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const describeBrowser = isChromiumInstalled() ? describe : describe.skip;

describeBrowser('reference-consumer Playwright', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it(
    'runs native page.goto via ServiceKeys.PlaywrightPage',
    async () => {
      const outputDir = await mkdtemp(path.join(tmpdir(), 'qakit-consumer-pw-'));
      dirs.push(outputDir);
      const summary = await runPlaywrightExample({ cwd: consumerRoot, outputDir });

      expect(summary.status).toBe('passed');
      expect(summary.results[0]?.status).toBe('passed');
      expect(ServiceKeys.PlaywrightPage).toBe('qakit.playwright.page');
    },
    90_000,
  );
});
