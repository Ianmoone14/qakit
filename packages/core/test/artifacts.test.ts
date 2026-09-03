import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FrameworkError } from '@qakit/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { FileSystemArtifactStore } from '../src/index.js';

describe('FileSystemArtifactStore', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  async function tempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'qakit-artifacts-'));
    dirs.push(dir);
    return dir;
  }

  it('copies a file into outputDir and assigns id and timestamp', async () => {
    const root = await tempDir();
    const source = path.join(root, 'shot.png');
    await writeFile(source, 'png-bytes');

    const store = new FileSystemArtifactStore({
      outputDir: 'artifacts',
      cwd: root,
    });

    const saved = await store.save({
      type: 'screenshot',
      name: 'home.png',
      path: source,
      executionId: 'exec-1',
      testId: 't1',
    });

    expect(saved.id.length).toBeGreaterThan(0);
    expect(saved.timestamp).toBeInstanceOf(Date);
    expect(saved.type).toBe('screenshot');
    expect(saved.executionId).toBe('exec-1');
    expect(saved.testId).toBe('t1');
    expect(saved.path.startsWith(path.join(root, 'artifacts', 'exec-1'))).toBe(true);
    expect(existsSync(saved.path)).toBe(true);
    expect(await readFile(saved.path, 'utf8')).toBe('png-bytes');
  });

  it('lists artifacts by test id', async () => {
    const root = await tempDir();
    await mkdir(path.join(root, 'src'));
    const trace = path.join(root, 'src', 'trace.zip');
    const note = path.join(root, 'src', 'note.txt');
    await writeFile(trace, 'trace');
    await writeFile(note, 'note');

    const store = new FileSystemArtifactStore({ outputDir: path.join(root, 'out') });

    await store.save({
      type: 'trace',
      name: 'trace.zip',
      path: trace,
      executionId: 'exec-1',
      testId: 't1',
    });
    await store.save({
      type: 'custom',
      name: 'note.txt',
      path: note,
      executionId: 'exec-1',
      testId: 't2',
    });

    expect(store.getByTest('t1')).toHaveLength(1);
    expect(store.getByTest('t1')[0]?.type).toBe('trace');
    expect(store.getByTest('t2')[0]?.type).toBe('custom');
    expect(store.getAll()).toHaveLength(2);
  });

  it('throws when the source file is missing', async () => {
    const root = await tempDir();
    const store = new FileSystemArtifactStore({ outputDir: root });

    await expect(
      store.save({
        type: 'log',
        name: 'missing.log',
        path: path.join(root, 'nope.log'),
        executionId: 'exec-1',
      }),
    ).rejects.toMatchObject({
      name: 'FrameworkError',
      code: 'ARTIFACT_SOURCE_NOT_FOUND',
    });
    await expect(
      store.save({
        type: 'log',
        name: 'missing.log',
        path: path.join(root, 'nope.log'),
        executionId: 'exec-1',
      }),
    ).rejects.toBeInstanceOf(FrameworkError);
  });
});
