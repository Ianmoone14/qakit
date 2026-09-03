import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FileSystemArtifactStore,
  LifecycleManager,
  ServiceKeys,
  createExecutionContext,
  createLogger,
  createTestContext,
  createTestResult,
  resolveConfig,
} from '@qakit/core';
import { type Browser, type Page } from 'playwright';
import { afterEach, describe, expect, it } from 'vitest';
import { PLAYWRIGHT_PACKAGE, isChromiumInstalled, registerPlaywright } from '../src/index.js';

const describeBrowser = isChromiumInstalled() ? describe : describe.skip;

describeBrowser('@qakit/playwright', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  async function startRun(options?: { screenshotOnFailure?: boolean; traceOnFailure?: boolean }) {
    const outputDir = await mkdtemp(path.join(tmpdir(), 'qakit-pw-'));
    dirs.push(outputDir);
    const config = resolveConfig({
      file: { project: 'checkout-api' },
      env: {},
      overrides: { artifacts: { outputDir } },
    });
    const store = new FileSystemArtifactStore({ outputDir });
    const execution = createExecutionContext({
      config,
      logger: createLogger({ level: 'error', format: 'pretty' }),
      artifacts: store,
      env: {},
    });
    const test = createTestContext(execution, {
      testId: 'pw-1',
      testName: 'native goto',
      testFile: 'playwright.test.ts',
    });
    const manager = new LifecycleManager();
    const playwrightOptions: { headless: true; screenshotOnFailure?: boolean; traceOnFailure?: boolean } = {
      headless: true,
    };
    if (options?.screenshotOnFailure === true) {
      playwrightOptions.screenshotOnFailure = true;
    }
    if (options?.traceOnFailure === true) {
      playwrightOptions.traceOnFailure = true;
    }
    registerPlaywright(manager, playwrightOptions);
    return { execution, test, manager, store };
  }

  it('registers native Playwright keys and supports page.goto', async () => {
    const { execution, test, manager } = await startRun();
    try {
      await manager.runBeforeExecution(execution);
      await manager.runBeforeTest(test);
      expect(execution.services.has(ServiceKeys.PlaywrightBrowser)).toBe(true);
      const page = test.services.get<Page>(ServiceKeys.PlaywrightPage);
      await page.goto('about:blank');
      expect(page.url()).toBe('about:blank');
    } finally {
      await manager.runTestCleanup(test);
      await manager.runCleanup(execution);
    }
  });

  it('closes the browser on cleanup', async () => {
    const { execution, test, manager } = await startRun();
    await manager.runBeforeExecution(execution);
    await manager.runBeforeTest(test);
    const browser = execution.services.get<Browser>(ServiceKeys.PlaywrightBrowser);
    expect(browser.isConnected()).toBe(true);
    await manager.runTestCleanup(test);
    await manager.runCleanup(execution);
    expect(browser.isConnected()).toBe(false);
  });

  it('stores a screenshot on failure when enabled', async () => {
    const { execution, test, manager, store } = await startRun({ screenshotOnFailure: true });
    try {
      await manager.runBeforeExecution(execution);
      await manager.runBeforeTest(test);
      await test.services.get<Page>(ServiceKeys.PlaywrightPage).goto('about:blank');
      const result = createTestResult({ ctx: test, status: 'failed', duration: 1, store });
      await manager.runAfterTest(test, result);
      expect(store.getByTest(test.testId).some((item) => item.type === 'screenshot')).toBe(true);
    } finally {
      await manager.runTestCleanup(test);
      await manager.runCleanup(execution);
    }
  });
});

describe('@qakit/playwright package', () => {
  it('exports package identity', () => {
    expect(PLAYWRIGHT_PACKAGE).toBe('@qakit/playwright');
  });

  it('does not add Playwright to @qakit/core', () => {
    const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'core', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
    expect(names.some((name) => name.toLowerCase().includes('playwright'))).toBe(false);
  });
});
