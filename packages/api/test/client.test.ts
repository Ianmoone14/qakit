import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import type { AuthProvider } from '@qakit/contracts';
import { TimeoutError } from '@qakit/contracts';
import { createExecutionContext, resolveConfig } from '@qakit/core';
import { apiExtension } from '../src/extension.js';
import { createApiClient } from '../src/client.js';
import { ApiServiceKeys } from '../src/keys.js';

async function withServer(
  handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    server.close();
    throw new Error('Failed to bind test server');
  }
  try {
    await run(`http://127.0.0.1:${address.port}`);
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
}

function ctx() {
  return createExecutionContext({
    config: resolveConfig({
      loaded: { project: 'api-project', baseUrl: 'https://example.com' },
      env: {},
      overrides: { logging: { level: 'error', format: 'json' } },
    }),
    env: {},
  });
}

describe('apiExtension', () => {
  it('registers an API client on beforeExecution', async () => {
    const extension = apiExtension({ timeout: 5_000 });
    const execution = ctx();
    await extension.hooks?.beforeExecution?.(execution);
    expect(execution.services.has(ApiServiceKeys.Client)).toBe(true);
  });
});

describe('createApiClient', () => {
  it('logs, sends auth headers, and returns a normalized response', async () => {
    await withServer(
      (req, res) => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ ok: true, auth: req.headers.authorization ?? null }));
      },
      async (baseUrl) => {
        const execution = ctx();
        const auth: AuthProvider = {
          name: 'test-auth',
          async getHeaders() {
            return { authorization: 'Bearer secret-token' };
          },
        };
        execution.services.register(ApiServiceKeys.Auth, auth);
        const client = createApiClient(execution, { baseUrl, timeout: 5_000 });
        const response = await client.request({ url: '/health' });
        expect(response.ok).toBe(true);
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ ok: true, auth: 'Bearer secret-token' });
        expect(response.duration).toBeGreaterThanOrEqual(0);
      },
    );
  });

  it('throws TimeoutError when the server does not respond', async () => {
    await withServer(
      () => {
        // never respond
      },
      async (baseUrl) => {
        const client = createApiClient(ctx(), { baseUrl, timeout: 50 });
        await expect(client.request({ url: '/slow' })).rejects.toBeInstanceOf(TimeoutError);
      },
    );
  });
});
