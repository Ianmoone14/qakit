import { createServer } from 'node:http';
import { expect, test } from 'vitest';
import { createApiClient } from '@qakit/api';
import { createExecutionContext, resolveConfig } from '@qakit/core';
import config from '../../qakit.config.js';

test('API client can call a JSON endpoint', async () => {
  const server = createServer((_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ service: 'example', ok: true }));
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('test server did not bind');
  }

  try {
    const ctx = createExecutionContext({
      config: resolveConfig({
        loaded: config,
        env: {},
        overrides: { logging: { level: 'error', format: 'json' } },
      }),
      env: {},
    });
    const client = createApiClient(ctx, {
      baseUrl: `http://127.0.0.1:${address.port}`,
      timeout: 5_000,
    });
    const response = await client.request({ url: '/status' });
    expect(response.ok).toBe(true);
    expect(response.body).toEqual({ service: 'example', ok: true });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
});
