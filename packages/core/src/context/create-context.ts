import type {
  ArtifactStore,
  ExecutionContext,
  Logger,
  ResolvedConfig,
  ServiceRegistry,
  TestContext,
  TestInfo,
} from '@qakit/contracts';
import { ulid } from 'ulid';
import type { EnvMap } from '../config/types.js';
import { detectCIContext } from './detect-ci.js';
import { frameworkVersion } from './framework-version.js';
import { MemoryServiceRegistry } from './memory-service-registry.js';

export interface CreateExecutionContextOptions {
  config: ResolvedConfig;
  logger: Logger;
  artifacts: ArtifactStore;
  services?: ServiceRegistry;
  env?: EnvMap;
  now?: Date;
  executionId?: string;
}

export function createExecutionContext(options: CreateExecutionContextOptions): ExecutionContext {
  const env = options.env ?? process.env;
  const ctx: ExecutionContext = {
    executionId: options.executionId ?? ulid(),
    project: options.config.project,
    environment: options.config.environment,
    startTime: options.now ?? new Date(),
    config: options.config,
    logger: options.logger,
    artifacts: options.artifacts,
    framework: frameworkVersion(),
    services: options.services ?? new MemoryServiceRegistry(),
    ci: detectCIContext(env),
  };
  return ctx;
}

export function createTestContext(execution: ExecutionContext, test: TestInfo): TestContext {
  return {
    ...execution,
    testId: test.testId,
    testName: test.testName,
    testFile: test.testFile,
    attempt: test.attempt ?? 1,
    tags: test.tags !== undefined ? [...test.tags] : [],
  };
}
