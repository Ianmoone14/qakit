import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { isChromiumInstalled } from '@qakit/playwright';
import { runUiTestExample } from '../src/run-ui-test-example.js';

const consumerRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const describeBrowser = isChromiumInstalled() ? describe : describe.skip;

describeBrowser('reference-consumer runUiTest', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it(
    'prints a usable ExecutionSummary after the driver run',
    async () => {
      const outputDir = await mkdtemp(path.join(tmpdir(), 'qakit-consumer-ui-'));
      dirs.push(outputDir);
      const summary = await runUiTestExample({ cwd: consumerRoot, outputDir });

      expect(summary.status).toBe('passed');
      expect(summary.results[0]?.status).toBe('passed');
      expect(summary.results[0]?.testName).toBe('opens about:blank');
      expect(typeof JSON.stringify(summary)).toBe('string');
    },
    90_000,
  );
});
