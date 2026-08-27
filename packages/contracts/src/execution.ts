import type { ArtifactManager } from './artifacts.js';
import type { CIContext, FrameworkVersion } from './ci.js';
import type { ResolvedConfig } from './config.js';
import type { Logger } from './logging.js';
import type { ServiceRegistry } from './services.js';

export interface ExecutionContext {
  executionId: string;
  project: string;
  environment: string;
  startTime: Date;
  config: ResolvedConfig;
  logger: Logger;
  artifacts: ArtifactManager;
  framework: FrameworkVersion;
  services: ServiceRegistry;
  ci?: CIContext;
}

export interface TestInfo {
  testId: string;
  testName: string;
  testFile: string;
  attempt?: number;
  tags?: string[];
}

export interface TestContext extends ExecutionContext {
  testId: string;
  testName: string;
  testFile: string;
  attempt: number;
  tags: string[];
}
