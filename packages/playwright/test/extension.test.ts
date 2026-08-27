import { describe, expect, it, vi } from 'vitest';
import { ServiceKeys } from '@qakit/contracts';
import { createExecutionContext, createTestContext, resolveConfig } from '@qakit/core';
import { playwrightExtension } from '../src/extension.js';
import { attachPlaywright, getPlaywrightSession } from '../src/session.js';

vi.mock('@playwright/test', () => {
  const page = {
    screenshot: vi.fn(async () => Buffer.from('')),
  };
  const context = {
    newPage: vi.fn(async () => page),
    tracing: {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
    },
    close: vi.fn(async () => undefined),
  };
  const browser = {
    newContext: vi.fn(async () => context),
    close: vi.fn(async () => undefined),
  };
  return {
    chromium: { launch: vi.fn(async () => browser) },
    firefox: { launch: vi.fn(async () => browser) },
    webkit: { launch: vi.fn(async () => browser) },
  };
});

function testCtx() {
  const exec = createExecutionContext({
    config: resolveConfig({
      loaded: { project: 'pw-project' },
      env: {},
      overrides: { logging: { level: 'error', format: 'json' } },
    }),
    env: {},
  });
  return createTestContext(exec, {
    testId: 't1',
    testName: 'demo',
    testFile: 'demo.spec.ts',
  });
}

describe('playwrightExtension', () => {
  it('exposes a named extension with lifecycle hooks', () => {
    const extension = playwrightExtension({ headless: true });
    expect(extension.name).toBe('playwright');
    expect(extension.version).toBe('1.0.0');
    expect(extension.hooks?.beforeTest).toBeTypeOf('function');
    expect(extension.hooks?.afterTest).toBeTypeOf('function');
    expect(extension.hooks?.testCleanup).toBeTypeOf('function');
  });

  it('starts a session on beforeTest and closes it on cleanup', async () => {
    const extension = playwrightExtension({ screenshot: 'off', trace: 'off' });
    const ctx = testCtx();
    await extension.hooks?.beforeTest?.(ctx);
    expect(ctx.services.has(ServiceKeys.PlaywrightPage)).toBe(true);
    const session = getPlaywrightSession(ctx);
    expect(session?.closed).toBe(false);
    await extension.hooks?.testCleanup?.(ctx);
    expect(session?.closed).toBe(true);
  });

  it('does not launch a second browser when a session is already attached', async () => {
    const ctx = testCtx();
    const fake = {
      close: vi.fn(async () => undefined),
    };
    attachPlaywright(ctx, {
      browser: fake as never,
      context: { close: fake.close, tracing: { start: vi.fn(), stop: vi.fn() } } as never,
      page: { screenshot: vi.fn() } as never,
    });
    const extension = playwrightExtension();
    await extension.hooks?.beforeTest?.(ctx);
    expect(getPlaywrightSession(ctx)?.browser).toBe(fake);
  });
});
