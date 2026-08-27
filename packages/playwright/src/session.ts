import type { Browser, BrowserContext, Page } from '@playwright/test';
import type { ExecutionContext } from '@qakit/contracts';
import { PlaywrightServiceKeys } from './keys.js';

export interface PlaywrightSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  closed: boolean;
  close(): Promise<void>;
}

export function attachPlaywright(
  ctx: ExecutionContext,
  handles: { browser: Browser; context: BrowserContext; page: Page },
): PlaywrightSession {
  const session: PlaywrightSession = {
    browser: handles.browser,
    context: handles.context,
    page: handles.page,
    closed: false,
    async close(): Promise<void> {
      if (session.closed) {
        return;
      }
      session.closed = true;
      await handles.context.close().catch(() => undefined);
      await handles.browser.close().catch(() => undefined);
    },
  };
  ctx.services.register(PlaywrightServiceKeys.Session, session);
  ctx.services.register(PlaywrightServiceKeys.Browser, handles.browser);
  ctx.services.register(PlaywrightServiceKeys.Context, handles.context);
  ctx.services.register(PlaywrightServiceKeys.Page, handles.page);
  return session;
}

export function getPlaywrightSession(ctx: ExecutionContext): PlaywrightSession | undefined {
  return ctx.services.tryGet<PlaywrightSession>(PlaywrightServiceKeys.Session);
}
