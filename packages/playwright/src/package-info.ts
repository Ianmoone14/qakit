import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const PLAYWRIGHT_PACKAGE = '@qakit/playwright';
export const PLAYWRIGHT_VERSION = (require('../package.json') as { version: string }).version;
