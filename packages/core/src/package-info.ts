import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const CORE_PACKAGE = '@qakit/core';
export const CORE_VERSION = (require('../package.json') as { version: string }).version;
