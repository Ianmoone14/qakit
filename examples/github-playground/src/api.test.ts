import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { runApiSmoke } from './run-api.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

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

describe('api', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it('GETs /ping through ServiceKeys.ApiClient', async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), 'qakit-play-api-'));
    dirs.push(outputDir);
    const server = await startPingServer();
    try {
      const summary = await runApiSmoke(root, outputDir, server.url);
      expect(summary.status).toBe('passed');
    } finally {
      await server.close();
    }
  });
});
