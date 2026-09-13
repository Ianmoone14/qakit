import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PLAYWRIGHT_SETTINGS_FILE,
  loadPlaywrightFileConfig,
  resolvePlaywrightOptions,
} from '../src/playwright-settings.js';

describe('qakit.playwright.json', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it('returns empty defaults when the file is missing', () => {
    expect(loadPlaywrightFileConfig(path.join(tmpdir(), 'missing-qakit-pw'))).toEqual({});
  });

  it('loads booleans and lets explicit options win', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'qakit-pw-json-'));
    dirs.push(cwd);
    await writeFile(
      path.join(cwd, PLAYWRIGHT_SETTINGS_FILE),
      `${JSON.stringify({ headless: false, screenshotOnFailure: true }, null, 2)}\n`,
    );
    const file = loadPlaywrightFileConfig(cwd);
    expect(file).toEqual({ headless: false, screenshotOnFailure: true });
    expect(resolvePlaywrightOptions(file, { headless: true })).toEqual({
      headless: true,
      screenshotOnFailure: true,
    });
  });

  it('rejects unknown keys', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'qakit-pw-bad-'));
    dirs.push(cwd);
    await writeFile(path.join(cwd, PLAYWRIGHT_SETTINGS_FILE), '{"browser":"firefox"}\n');
    expect(() => loadPlaywrightFileConfig(cwd)).toThrow(/unknown keys/);
  });
});
