import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  FrameworkError,
  LifecycleManager,
  ServiceKeys,
  type Extension,
  type LifecycleHookOptions,
  type LifecyclePhase,
  type TestContext,
} from '@qakit/core';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { PLAYWRIGHT_PACKAGE, PLAYWRIGHT_VERSION } from './package-info.js';

export interface PlaywrightExtensionOptions {
  headless?: boolean;
  screenshotOnFailure?: boolean;
  traceOnFailure?: boolean;
}

const HOOK_TIMEOUTS: Partial<Record<LifecyclePhase, LifecycleHookOptions>> = {
  beforeExecution: { timeout: 120_000, critical: true },
  beforeTest: { timeout: 60_000, critical: true },
  afterTest: { timeout: 60_000 },
  testCleanup: { timeout: 60_000 },
  cleanup: { timeout: 60_000 },
};

async function closeQuietly(close: (() => Promise<unknown>) | undefined): Promise<void> {
  if (close === undefined) {
    return;
  }
  try {
    await close();
  } catch {
    // already closed
  }
}

async function persistArtifact(
  ctx: TestContext,
  type: 'screenshot' | 'trace',
  name: string,
  sourcePath: string,
): Promise<void> {
  await ctx.artifacts.save({
    type,
    name,
    path: sourcePath,
    executionId: ctx.executionId,
    testId: ctx.testId,
  });
}

/**
 * Native Playwright only. Teams use `page.goto` / locators — this package does not wrap actions.
 */
export function createPlaywrightExtension(options: PlaywrightExtensionOptions = {}): Extension {
  const headless = options.headless !== false;
  const screenshotOnFailure = options.screenshotOnFailure === true;
  const traceOnFailure = options.traceOnFailure === true;
  let tracing = false;

  return {
    name: PLAYWRIGHT_PACKAGE,
    version: PLAYWRIGHT_VERSION,
    hooks: {
      async beforeExecution(ctx) {
        try {
          const browser = await chromium.launch({ headless });
          ctx.services.register(ServiceKeys.PlaywrightBrowser, browser);
        } catch (cause) {
          throw new FrameworkError('Failed to launch Chromium', {
            code: 'PLAYWRIGHT_LAUNCH_FAILED',
            cause,
          });
        }
      },

      async beforeTest(ctx) {
        const browser = ctx.services.get<Browser>(ServiceKeys.PlaywrightBrowser);
        const context = await browser.newContext();
        if (traceOnFailure) {
          await context.tracing.start({ screenshots: true, snapshots: true });
          tracing = true;
        }
        const page = await context.newPage();
        ctx.services.register(ServiceKeys.PlaywrightContext, context);
        ctx.services.register(ServiceKeys.PlaywrightPage, page);
      },

      async afterTest(ctx, result) {
        const failed = result.status === 'failed' || result.status === 'timedOut';
        const page = ctx.services.tryGet<Page>(ServiceKeys.PlaywrightPage);
        const context = ctx.services.tryGet<BrowserContext>(ServiceKeys.PlaywrightContext);

        if (failed && screenshotOnFailure && page !== undefined) {
          const tmp = path.join(tmpdir(), `qakit-${result.testId}-screenshot.png`);
          await page.screenshot({ path: tmp });
          try {
            await persistArtifact(ctx, 'screenshot', 'failure.png', tmp);
          } finally {
            await rm(tmp, { force: true });
          }
        }

        if (traceOnFailure && tracing && context !== undefined) {
          const tmp = path.join(tmpdir(), `qakit-${result.testId}-trace.zip`);
          await context.tracing.stop({ path: tmp });
          tracing = false;
          try {
            if (failed) {
              await persistArtifact(ctx, 'trace', 'trace.zip', tmp);
            }
          } finally {
            await rm(tmp, { force: true });
          }
        }
      },

      async testCleanup(ctx) {
        const context = ctx.services.tryGet<BrowserContext>(ServiceKeys.PlaywrightContext);
        if (tracing && context !== undefined) {
          try {
            await context.tracing.stop();
          } catch {
            // tracing already stopped in afterTest
          }
          tracing = false;
        }
        const page = ctx.services.tryGet<Page>(ServiceKeys.PlaywrightPage);
        await closeQuietly(page !== undefined ? () => page.close() : undefined);
        await closeQuietly(context !== undefined ? () => context.close() : undefined);
      },

      async cleanup(ctx) {
        const browser = ctx.services.tryGet<Browser>(ServiceKeys.PlaywrightBrowser);
        await closeQuietly(browser !== undefined ? () => browser.close() : undefined);
      },
    },
  };
}

export function registerPlaywright(
  manager: LifecycleManager,
  options?: PlaywrightExtensionOptions,
): void {
  manager.registerExtension(createPlaywrightExtension(options), HOOK_TIMEOUTS);
}
