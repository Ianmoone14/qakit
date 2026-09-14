import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const API_PACKAGE = '@qakit/api';
export const API_VERSION = (require('../package.json') as { version: string }).version;
