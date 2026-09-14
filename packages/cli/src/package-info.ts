import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const CLI_PACKAGE = '@qakit/cli';
export const CLI_VERSION = (require('../package.json') as { version: string }).version;
export const CLI_BIN = 'qakit';
