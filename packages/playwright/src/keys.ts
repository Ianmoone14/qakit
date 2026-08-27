import { ServiceKeys } from '@qakit/contracts';

export const PlaywrightServiceKeys = {
  Browser: ServiceKeys.PlaywrightBrowser,
  Context: ServiceKeys.PlaywrightContext,
  Page: ServiceKeys.PlaywrightPage,
  Session: 'qakit.playwright.session',
} as const;
