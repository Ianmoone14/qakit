import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { ServiceKeys } from '@qakit/core';
import { runApiExample } from '../src/run-api-example.js';

const consumerRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

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

describe('reference-consumer API', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it('runs a generic GET via ServiceKeys.ApiClient', async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), 'qakit-consumer-api-'));
    dirs.push(outputDir);
    const server = await startPingServer();
    try {
      const summary = await runApiExample({
        cwd: consumerRoot,
        outputDir,
        baseUrl: server.url,
      });
      expect(summary.status).toBe('passed');
      expect(summary.results[0]?.status).toBe('passed');
      expect(summary.results[0]?.artifacts.some((item) => item.type === 'request')).toBe(true);
      expect(ServiceKeys.ApiClient).toBe('qakit.api.client');
    } finally {
      await server.close();
    }
  });
});
