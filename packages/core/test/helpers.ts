import type { Artifact, ArtifactInput, ArtifactStore, Logger } from '@qakit/contracts';

export function silentLogger(): Logger {
  const logger: Logger = {
    debug() {},
    info() {},
    warn() {},
    error() {},
    child() {
      return logger;
    },
  };
  return logger;
}

export function memoryArtifacts(): ArtifactStore {
  const items: Artifact[] = [];
  return {
    async save(input: ArtifactInput): Promise<Artifact> {
      const artifact: Artifact = {
        ...input,
        id: `artifact-${String(items.length + 1)}`,
        timestamp: new Date(),
      };
      items.push(artifact);
      return artifact;
    },
    getAll() {
      return [...items];
    },
    getByTest(testId: string) {
      return items.filter((item) => item.testId === testId);
    },
  };
}
