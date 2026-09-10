import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { isChromiumInstalled } from '@qakit/playwright';
import { runPlaywrightSmoke } from './run-playwright.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const describeBrowser = isChromiumInstalled() ? describe : describe.skip;

describeBrowser('playwright', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it(
    'opens about:blank through ServiceKeys.PlaywrightPage',
    async () => {
      const outputDir = await mkdtemp(path.join(tmpdir(), 'qakit-play-pw-'));
      dirs.push(outputDir);
      const summary = await runPlaywrightSmoke(root, outputDir);
      expect(summary.status).toBe('passed');
    },
    90_000,
  );
});
