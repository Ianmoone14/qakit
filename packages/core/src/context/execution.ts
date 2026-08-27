import type { ExecutionContext, ResolvedConfig } from '@qakit/contracts';
import { QAKIT_NAME, QAKIT_VERSION } from '@qakit/contracts';
import { ulid } from 'ulid';
import { createArtifactManager } from '../artifacts/manager.js';
import { createLogger } from '../logging/create-logger.js';
import { InMemoryServiceRegistry } from '../services/registry.js';
import { CORE_VERSION } from '../version.js';
import { detectCI } from './ci.js';

export interface CreateExecutionContextOptions {
  config: ResolvedConfig;
  now?: Date;
  env?: NodeJS.ProcessEnv;
}

export function createExecutionContext(options: CreateExecutionContextOptions): ExecutionContext {
  const executionId = ulid();
  const env = options.env ?? process.env;
  const ci = detectCI(env);
  const startTime = options.now ?? new Date();

  const logger = createLogger({
    level: options.config.logging.level,
    format: options.config.logging.format,
    bindings: {
      executionId,
      project: options.config.project,
      environment: options.config.environment,
    },
  });

  const ctx: ExecutionContext = {
    executionId,
    project: options.config.project,
    environment: options.config.environment,
    startTime,
    config: options.config,
    logger,
    artifacts: createArtifactManager(options.config.artifacts.outputDir, executionId),
    framework: {
      name: QAKIT_NAME,
      version: CORE_VERSION,
      packages: {
        '@qakit/core': CORE_VERSION,
        '@qakit/contracts': QAKIT_VERSION,
      },
    },
    services: new InMemoryServiceRegistry(),
  };

  if (ci !== undefined) {
    ctx.ci = ci;
  }

  return ctx;
}
