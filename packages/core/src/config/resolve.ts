import type { QakitConfig, ResolvedConfig } from '@qakit/contracts';
import { DEFAULT_CONFIG } from '@qakit/contracts';
import { isCiEnvironment, readEnvConfig } from './env.js';
import { validateConfig } from './validate.js';

export interface ResolveConfigOptions {
  loaded?: QakitConfig;
  env?: NodeJS.ProcessEnv;
  overrides?: Partial<QakitConfig>;
}

/**
 * Merge order (weakest → strongest): defaults → config file → env vars → overrides.
 * When running in CI and format was not set by file or overrides, JSON logging is used.
 */
export function resolveConfig(options: ResolveConfigOptions = {}): ResolvedConfig {
  const env = options.env ?? process.env;
  const envSlice = readEnvConfig(env);
  const loaded = options.loaded;
  const overrides = options.overrides;

  const formatFromFile = loaded?.logging?.format;
  const formatFromOverrides = overrides?.logging?.format;
  const inferredFormat =
    formatFromOverrides ??
    formatFromFile ??
    (isCiEnvironment(env) ? 'json' : DEFAULT_CONFIG.logging.format);

  const merged: Record<string, unknown> = {
    environment: DEFAULT_CONFIG.environment,
    retry: { ...DEFAULT_CONFIG.retry, ...loaded?.retry, ...overrides?.retry },
    logging: {
      level:
        overrides?.logging?.level ??
        envSlice.logging?.level ??
        loaded?.logging?.level ??
        DEFAULT_CONFIG.logging.level,
      format: inferredFormat,
    },
    artifacts: {
      ...DEFAULT_CONFIG.artifacts,
      ...loaded?.artifacts,
      ...overrides?.artifacts,
    },
    extensions: overrides?.extensions ?? loaded?.extensions ?? DEFAULT_CONFIG.extensions,
  };

  const project = overrides?.project ?? envSlice.project ?? loaded?.project;
  if (project !== undefined) {
    merged.project = project;
  }

  const environment = overrides?.environment ?? envSlice.environment ?? loaded?.environment;
  if (environment !== undefined) {
    merged.environment = environment;
  }

  const baseUrl = overrides?.baseUrl ?? loaded?.baseUrl;
  if (baseUrl !== undefined) {
    merged.baseUrl = baseUrl;
  }

  return validateConfig(merged);
}
