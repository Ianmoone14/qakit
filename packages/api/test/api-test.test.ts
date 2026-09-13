import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveConfig } from '@qakit/core';
import { afterEach, describe, expect, it } from 'vitest';
import { runApiTest } from '../src/run-api-test.js';

async function startPingServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('pong');
  });
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

describe('runApiTest', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it('runs a generic GET and returns a passed summary', async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), 'qakit-api-run-'));
    dirs.push(outputDir);
    const server = await startPingServer();
    try {
      const summary = await runApiTest(
        'GET /ping',
        async ({ api }) => {
          const response = await api.request({ method: 'GET', url: '/ping' });
          expect(response.body).toBe('pong');
        },
        {
          saveArtifacts: true,
          env: {},
          cwd: outputDir,
          config: resolveConfig({
            file: { project: 'checkout-api', baseUrl: server.url },
            env: {},
            overrides: { artifacts: { outputDir } },
          }),
        },
      );
      expect(summary.status).toBe('passed');
      expect(summary.results[0]?.artifacts.some((item) => item.type === 'request')).toBe(true);
    } finally {
      await server.close();
    }
  });
});
