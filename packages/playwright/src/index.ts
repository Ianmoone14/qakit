export { PLAYWRIGHT_PACKAGE, PLAYWRIGHT_VERSION } from './package-info.js';
export { isChromiumInstalled } from './chromium.js';
export {
  createPlaywrightExtension,
  registerPlaywright,
} from './create-playwright-extension.js';
export type { PlaywrightExtensionOptions } from './create-playwright-extension.js';

export type { Browser, BrowserContext, Page } from 'playwright';
