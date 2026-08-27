export { playwrightExtension } from './extension.js';
export {
  DEFAULT_PLAYWRIGHT_CONFIG,
  PLAYWRIGHT_EXTENSION_VERSION,
  resolvePlaywrightConfig,
} from './config.js';
export type {
  ArtifactPolicy,
  PlaywrightBrowserName,
  PlaywrightConfig,
  TracePolicy,
  VideoPolicy,
} from './config.js';
export { PlaywrightServiceKeys } from './keys.js';
export { attachPlaywright, getPlaywrightSession } from './session.js';
export type { PlaywrightSession } from './session.js';
