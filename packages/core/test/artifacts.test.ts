import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileArtifactManager } from '../src/artifacts/manager.js';

describe('FileArtifactManager', () => {
  it('creates directories, assigns a ULID, and writes manifest.json', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qakit-art-'));
    const manager = new FileArtifactManager(root, '01EXECUTIONIDTEST00000000');
    const saved = await manager.save({
      type: 'screenshot',
      name: 'failure.png',
      path: join(root, 'failure.png'),
      executionId: '01EXECUTIONIDTEST00000000',
      testId: 'test-1',
    });
    expect(saved.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/i);
    expect(manager.getByTest('test-1')).toHaveLength(1);
    expect(manager.getAll()).toHaveLength(1);

    const manifestPath = join(root, '01EXECUTIONIDTEST00000000', 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Array<{ name: string }>;
    expect(manifest[0]?.name).toBe('failure.png');
  });
});
