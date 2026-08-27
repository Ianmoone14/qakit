import { defineConfig } from '@qakit/core';
import { playwrightExtension } from '@qakit/playwright';
import { apiExtension } from '@qakit/api';

export default defineConfig({
  project: 'example-project',
  environment: 'development',
  baseUrl: 'https://example.com',
  extensions: [
    playwrightExtension({ headless: true }),
    apiExtension({ timeout: 30000 }),
  ],
});
