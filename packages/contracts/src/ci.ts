export interface CIContext {
  provider: 'gitlab' | 'github' | 'generic';
  commitSha?: string;
  pipelineId?: string;
  jobId?: string;
  branch?: string;
  raw: Record<string, string>;
}

export interface FrameworkVersion {
  name: string;
  version: string;
  packages: Record<string, string>;
}
