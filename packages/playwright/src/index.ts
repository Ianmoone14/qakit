export { PLAYWRIGHT_PACKAGE, PLAYWRIGHT_VERSION } from './package-info.js';
export { isChromiumInstalled } from './chromium.js';
export {
  createPlaywrightExtension,
  registerPlaywright,
} from './create-playwright-extension.js';
export type { PlaywrightExtensionOptions } from './create-playwright-extension.js';
export {
  loadPlaywrightFileConfig,
  resolvePlaywrightOptions,
  PLAYWRIGHT_SETTINGS_FILE,
} from './playwright-settings.js';
export type { PlaywrightFileConfig } from './playwright-settings.js';
export { runUiTest } from './run-ui-test.js';
export type {
  RunUiTestOptions,
  UiApiClient,
  UiTestApiOption,
  UiTestFixtures,
} from './run-ui-test.js';

export type { Browser, BrowserContext, Page } from 'playwright';
