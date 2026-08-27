import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Extension, TestContext, TestResult } from '@qakit/contracts';
import type { PlaywrightConfig } from './config.js';
import { PLAYWRIGHT_EXTENSION_VERSION, resolvePlaywrightConfig } from './config.js';
import { attachPlaywright, getPlaywrightSession } from './session.js';

export function playwrightExtension(config: PlaywrightConfig = {}): Extension {
  const resolved = resolvePlaywrightConfig(config);

  return {
    name: 'playwright',
    version: PLAYWRIGHT_EXTENSION_VERSION,
    hooks: {
      beforeTest: async (ctx: TestContext): Promise<void> => {
        if (getPlaywrightSession(ctx) !== undefined) {
          return;
        }

        const playwright = await import('@playwright/test');
        const launcher = playwright[resolved.browser];
        const browser = await launcher.launch({ headless: resolved.headless });
        const contextOptions: { baseURL?: string } = {};
        const baseURL = resolved.baseURL ?? ctx.config.baseUrl;
        if (baseURL !== undefined) {
          contextOptions.baseURL = baseURL;
        }
        const context = await browser.newContext(contextOptions);
        if (resolved.trace !== 'off') {
          await context.tracing.start({ screenshots: true, snapshots: true });
        }
        const page = await context.newPage();
        attachPlaywright(ctx, { browser, context, page });
        ctx.logger.debug('Playwright session started', { browser: resolved.browser });
      },

      afterTest: async (ctx: TestContext, result: TestResult): Promise<void> => {
        const session = getPlaywrightSession(ctx);
        if (session === undefined) {
          return;
        }

        const failed = result.status === 'failed' || result.status === 'timedOut';
        const outputDir = join(
          ctx.config.artifacts.outputDir,
          ctx.executionId,
          ctx.testId,
        );
        await mkdir(outputDir, { recursive: true });

        const shouldScreenshot =
          resolved.screenshot === 'on' || (resolved.screenshot === 'only-on-failure' && failed);
        if (shouldScreenshot) {
          const screenshotPath = join(outputDir, 'screenshot.png');
          await session.page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
          await ctx.artifacts.save({
            type: 'screenshot',
            name: 'screenshot.png',
            path: screenshotPath,
            executionId: ctx.executionId,
            testId: ctx.testId,
          });
        }

        if (resolved.trace === 'on' || (resolved.trace === 'retain-on-failure' && failed)) {
          const tracePath = join(outputDir, 'trace.zip');
          await session.context.tracing.stop({ path: tracePath }).catch(() => undefined);
          await ctx.artifacts.save({
            type: 'trace',
            name: 'trace.zip',
            path: tracePath,
            executionId: ctx.executionId,
            testId: ctx.testId,
          });
        } else if (resolved.trace === 'retain-on-failure') {
          await session.context.tracing.stop().catch(() => undefined);
        }

        await session.close();
      },

      testCleanup: async (ctx: TestContext): Promise<void> => {
        const session = getPlaywrightSession(ctx);
        if (session !== undefined) {
          await session.close();
        }
      },
    },
  };
}
