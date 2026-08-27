export const ARTIFACT_TYPES = [
  'screenshot',
  'video',
  'trace',
  'log',
  'data',
  'request',
  'response',
  'custom',
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export interface Artifact {
  id: string;
  type: ArtifactType;
  name: string;
  path: string;
  executionId: string;
  testId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type ArtifactInput = Omit<Artifact, 'id' | 'timestamp'>;

/** Filesystem first. Object storage later must not require a contract break. */
export interface ArtifactStore {
  save(artifact: ArtifactInput): Promise<Artifact>;
  getAll(): Artifact[];
  getByTest(testId: string): Artifact[];
}
