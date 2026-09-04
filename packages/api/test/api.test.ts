import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import {
  FileSystemArtifactStore,
  LifecycleManager,
  ServiceKeys,
  createExecutionContext,
  createLogger,
  createTestContext,
  resolveConfig,
  type AuthProvider,
} from '@qakit/core';
import { afterEach, describe, expect, it } from 'vitest';
import { API_PACKAGE, registerApi, type ApiClient } from '../src/index.js';

async function startServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void,
): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer(handler);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve();
    });
  });
  const addr = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${String(addr.port)}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

describe('@qakit/api', () => {
  const dirs: string[] = [];
  const closers: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await Promise.all(closers.splice(0).map((close) => close()));
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  async function startRun(options?: {
    auth?: AuthProvider;
    authOnRegistry?: AuthProvider;
    saveArtifacts?: boolean;
    baseUrl?: string;
  }) {
    const outputDir = await mkdtemp(path.join(tmpdir(), 'qakit-api-'));
    dirs.push(outputDir);
    const file: { project: string; baseUrl?: string } = { project: 'checkout-api' };
    if (options?.baseUrl !== undefined) {
      file.baseUrl = options.baseUrl;
    }
    const config = resolveConfig({
      file,
      env: {},
      overrides: { artifacts: { outputDir } },
    });
    const store = new FileSystemArtifactStore({ outputDir });
    const execution = createExecutionContext({
      config,
      logger: createLogger({ level: 'error', format: 'pretty' }),
      artifacts: store,
      env: {},
    });
    const test = createTestContext(execution, {
      testId: 'api-1',
      testName: 'http',
      testFile: 'api.test.ts',
    });
    const manager = new LifecycleManager();
    const apiOptions: { auth?: AuthProvider; saveArtifacts?: boolean } = {};
    if (options?.auth !== undefined) {
      apiOptions.auth = options.auth;
    }
    if (options?.saveArtifacts === true) {
      apiOptions.saveArtifacts = true;
    }
    registerApi(manager, apiOptions);
    if (options?.authOnRegistry !== undefined) {
      test.services.register(ServiceKeys.Auth, options.authOnRegistry);
    }
    await manager.runBeforeTest(test);
    return { execution, test, manager, store };
  }

  it('registers a client and returns a successful response', async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
    });
    closers.push(server.close);
    const { test, manager } = await startRun();
    try {
      expect(test.services.has(ServiceKeys.ApiClient)).toBe(true);
      const client = test.services.get<ApiClient>(ServiceKeys.ApiClient);
      const response = await client.request({ method: 'GET', url: `${server.url}/ok` });
      expect(response.status).toBe(200);
      expect(response.body).toBe('ok');
    } finally {
      await manager.runTestCleanup(test);
    }
  });

  it('sends headers from an AuthProvider', async () => {
    let received = '';
    const server = await startServer((req, res) => {
      received = req.headers.authorization ?? '';
      res.writeHead(200);
      res.end('auth-ok');
    });
    closers.push(server.close);
    const auth: AuthProvider = {
      name: 'test-auth',
      async getHeaders() {
        return { authorization: 'Bearer secret' };
      },
    };
    const { test, manager } = await startRun({ auth });
    try {
      const client = test.services.get<ApiClient>(ServiceKeys.ApiClient);
      await client.request({ method: 'GET', url: `${server.url}/secure` });
      expect(received).toBe('Bearer secret');
    } finally {
      await manager.runTestCleanup(test);
    }
  });

  it('uses AuthProvider registered on ServiceKeys.Auth', async () => {
    let received = '';
    const server = await startServer((req, res) => {
      received = req.headers['x-auth'] ?? '';
      res.writeHead(200);
      res.end('ok');
    });
    closers.push(server.close);
    const auth: AuthProvider = {
      name: 'registry-auth',
      async getHeaders() {
        return { 'x-auth': 'from-registry' };
      },
    };
    const { test, manager } = await startRun({ authOnRegistry: auth });
    try {
      const client = test.services.get<ApiClient>(ServiceKeys.ApiClient);
      await client.request({ method: 'GET', url: `${server.url}/secure` });
      expect(received).toBe('from-registry');
    } finally {
      await manager.runTestCleanup(test);
    }
  });

  it('throws IntegrationError on 4xx', async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(404);
      res.end('missing');
    });
    closers.push(server.close);
    const { test, manager } = await startRun();
    try {
      const client = test.services.get<ApiClient>(ServiceKeys.ApiClient);
      await expect(client.request({ method: 'GET', url: `${server.url}/missing` })).rejects.toMatchObject({
        name: 'IntegrationError',
        code: 'HTTP_CLIENT_ERROR',
      });
    } finally {
      await manager.runTestCleanup(test);
    }
  });

  it('throws IntegrationError on 5xx', async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(503);
      res.end('down');
    });
    closers.push(server.close);
    const { test, manager } = await startRun();
    try {
      const client = test.services.get<ApiClient>(ServiceKeys.ApiClient);
      await expect(client.request({ method: 'GET', url: `${server.url}/down` })).rejects.toMatchObject({
        name: 'IntegrationError',
        code: 'HTTP_SERVER_ERROR',
      });
    } finally {
      await manager.runTestCleanup(test);
    }
  });

  it('throws TimeoutError when the request exceeds timeout', async () => {
    const server = await startServer((_req, res) => {
      setTimeout(() => {
        res.writeHead(200);
        res.end('late');
      }, 1_000);
    });
    closers.push(server.close);
    const { test, manager } = await startRun();
    try {
      const client = test.services.get<ApiClient>(ServiceKeys.ApiClient);
      await expect(
        client.request({ method: 'GET', url: `${server.url}/slow`, timeout: 50 }),
      ).rejects.toMatchObject({
        name: 'TimeoutError',
        code: 'HTTP_TIMEOUT',
      });
    } finally {
      await manager.runTestCleanup(test);
    }
  });

  it('throws IntegrationError on network failure', async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200);
      res.end('ok');
    });
    const url = `${server.url}/gone`;
    await server.close();
    const { test, manager } = await startRun();
    try {
      const client = test.services.get<ApiClient>(ServiceKeys.ApiClient);
      await expect(client.request({ method: 'GET', url })).rejects.toMatchObject({
        name: 'IntegrationError',
        code: 'HTTP_NETWORK_ERROR',
      });
    } finally {
      await manager.runTestCleanup(test);
    }
  });

  it('stores request and response artifacts when enabled', async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('saved');
    });
    closers.push(server.close);
    const { test, manager, store } = await startRun({ saveArtifacts: true });
    try {
      const client = test.services.get<ApiClient>(ServiceKeys.ApiClient);
      await client.request({ method: 'GET', url: `${server.url}/ok` });
      const types = store.getByTest(test.testId).map((item) => item.type);
      expect(types).toContain('request');
      expect(types).toContain('response');
    } finally {
      await manager.runTestCleanup(test);
    }
  });

  it('resolves a relative URL against config.baseUrl', async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200);
      res.end('relative');
    });
    closers.push(server.close);
    const { test, manager } = await startRun({ baseUrl: server.url });
    try {
      const client = test.services.get<ApiClient>(ServiceKeys.ApiClient);
      const response = await client.request({ method: 'GET', url: '/relative' });
      expect(response.body).toBe('relative');
    } finally {
      await manager.runTestCleanup(test);
    }
  });
});

describe('@qakit/api package', () => {
  it('exports package identity', () => {
    expect(API_PACKAGE).toBe('@qakit/api');
  });
});
