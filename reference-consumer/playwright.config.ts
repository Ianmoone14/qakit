import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  use: {
    baseURL: 'https://example.com',
    headless: true,
    browserName: 'chromium',
  },
});
