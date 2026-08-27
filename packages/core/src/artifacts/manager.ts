import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Artifact, ArtifactInput, ArtifactManager } from '@qakit/contracts';
import { ulid } from 'ulid';

export class FileArtifactManager implements ArtifactManager {
  readonly #artifacts: Artifact[] = [];
  readonly #rootDir: string;
  readonly #executionId: string;

  constructor(rootDir: string, executionId: string) {
    this.#rootDir = rootDir;
    this.#executionId = executionId;
  }

  async save(input: ArtifactInput): Promise<Artifact> {
    const id = ulid();
    const testSegment = input.testId ?? '_execution';
    const dir = join(this.#rootDir, this.#executionId, testSegment);
    await mkdir(dir, { recursive: true });

    const artifact: Artifact = {
      id,
      type: input.type,
      name: input.name,
      path: input.path,
      executionId: input.executionId,
      timestamp: new Date(),
    };
    if (input.testId !== undefined) {
      artifact.testId = input.testId;
    }
    if (input.metadata !== undefined) {
      artifact.metadata = input.metadata;
    }

    this.#artifacts.push(artifact);
    await this.#writeManifest(dir);
    await this.#writeManifest(join(this.#rootDir, this.#executionId));
    return artifact;
  }

  getAll(): Artifact[] {
    return [...this.#artifacts];
  }

  getByTest(testId: string): Artifact[] {
    return this.#artifacts.filter((artifact) => artifact.testId === testId);
  }

  async #writeManifest(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
    const payload = this.#artifacts.map((artifact) => ({
      ...artifact,
      timestamp: artifact.timestamp.toISOString(),
    }));
    await writeFile(join(dir, 'manifest.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }
}

export function createArtifactManager(rootDir: string, executionId: string): ArtifactManager {
  return new FileArtifactManager(rootDir, executionId);
}
