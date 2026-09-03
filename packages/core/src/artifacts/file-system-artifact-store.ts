import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  FrameworkError,
  type Artifact,
  type ArtifactInput,
  type ArtifactStore,
} from '@qakit/contracts';
import { ulid } from 'ulid';

export interface FileSystemArtifactStoreOptions {
  /** Directory from resolved config (`artifacts.outputDir`). Relative paths resolve against `cwd`. */
  outputDir: string;
  cwd?: string;
}

function safeFileName(name: string): string {
  const trimmed = name.trim();
  const base = trimmed.length > 0 ? trimmed : 'artifact';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return cleaned.slice(0, 120) || 'artifact';
}

export class FileSystemArtifactStore implements ArtifactStore {
  readonly outputDir: string;
  readonly #records: Artifact[] = [];

  constructor(options: FileSystemArtifactStoreOptions) {
    const cwd = options.cwd ?? process.cwd();
    this.outputDir = path.resolve(cwd, options.outputDir);
  }

  async save(input: ArtifactInput): Promise<Artifact> {
    const source = path.resolve(input.path);
    if (!existsSync(source)) {
      throw new FrameworkError(`Artifact source not found: ${source}`, {
        code: 'ARTIFACT_SOURCE_NOT_FOUND',
        context: { path: source, name: input.name },
      });
    }

    const id = ulid();
    const timestamp = new Date();
    const destDir = path.join(this.outputDir, input.executionId);
    await mkdir(destDir, { recursive: true });

    const destPath = path.join(destDir, `${id}_${safeFileName(input.name)}`);
    await copyFile(source, destPath);

    const artifact: Artifact = {
      id,
      type: input.type,
      name: input.name,
      path: destPath,
      executionId: input.executionId,
      timestamp,
    };
    if (input.testId !== undefined) {
      artifact.testId = input.testId;
    }
    if (input.metadata !== undefined) {
      artifact.metadata = input.metadata;
    }

    this.#records.push(artifact);
    return artifact;
  }

  getAll(): Artifact[] {
    return [...this.#records];
  }

  getByTest(testId: string): Artifact[] {
    return this.#records.filter((item) => item.testId === testId);
  }
}
