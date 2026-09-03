import { CONTRACTS_PACKAGE } from '@qakit/contracts';
import { CORE_PACKAGE, CORE_VERSION } from './package-info.js';

export { CORE_PACKAGE, CORE_VERSION, CONTRACTS_PACKAGE };

export { CONFIG_ERROR_CODES } from './config/codes.js';
export { defineConfig } from './config/define-config.js';
export { loadConfig } from './config/load-config.js';
export { resolveConfig } from './config/resolve-config.js';
export type { ConfigLayer, EnvMap, LoadConfigOptions, ResolveConfigInput } from './config/types.js';
export { validateConfig } from './config/validate-config.js';

export { createExecutionContext, createTestContext } from './context/create-context.js';
export type { CreateExecutionContextOptions } from './context/create-context.js';
export { detectCIContext } from './context/detect-ci.js';
export { MemoryServiceRegistry } from './context/memory-service-registry.js';
export { LifecycleManager } from './lifecycle/lifecycle-manager.js';
export type { RegisterHookOptions } from './lifecycle/lifecycle-manager.js';

export {
  ConfigurationError,
  FrameworkError,
  TimeoutError,
  type ExecutionContext,
  type Extension,
  type QakitConfig,
  type ResolvedConfig,
  type TestContext,
  type TestInfo,
} from '@qakit/contracts';
