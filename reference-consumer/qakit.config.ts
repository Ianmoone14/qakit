import { defineConfig, type Extension } from '@qakit/core';

const exampleFixture: Extension = {
  name: 'example-fixture',
  version: '1.0.0',
  hooks: {
    async beforeTest(ctx) {
      ctx.services.register('qakit.auth', { token: 'demo' });
    },
  },
};

export default defineConfig({
  project: 'example-project',
  environment: 'development',
  logging: { level: 'info', format: 'json' },
  extensions: [exampleFixture],
});
