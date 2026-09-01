import {
  ConfigurationError,
  DEFAULT_CONFIG,
  type QakitConfig,
  type ResolvedConfig,
} from '@qakit/contracts';
import { CONFIG_ERROR_CODES } from './codes.js';
import { envOverlay } from './env.js';
import { mergeConfigLayers, mergeStateToCandidate } from './merge.js';
import type { ResolveConfigInput } from './types.js';
import { validateConfig } from './validate-config.js';

function processEnv(): Record<string, string | undefined> {
  return process.env;
}

export function resolveConfig(input: ResolveConfigInput = {}): ResolvedConfig {
  const envSource = input.env ?? processEnv();
  const merged = mergeConfigLayers(input.file, envOverlay(envSource), input.overrides);
  const candidate = mergeStateToCandidate(merged);

  if (typeof candidate.project !== 'string' || candidate.project.length === 0) {
    throw new ConfigurationError('project is required after config merge', {
      code: CONFIG_ERROR_CODES.MISSING_PROJECT,
    });
  }

  const parsed = validateConfig(candidate);
  return toResolvedConfig(parsed);
}

function toResolvedConfig(parsed: QakitConfig): ResolvedConfig {
  const resolved: ResolvedConfig = {
    project: parsed.project,
    environment: parsed.environment ?? DEFAULT_CONFIG.environment,
    retry: {
      attempts: parsed.retry?.attempts ?? DEFAULT_CONFIG.retry.attempts,
      delay: parsed.retry?.delay ?? DEFAULT_CONFIG.retry.delay,
    },
    logging: {
      level: parsed.logging?.level ?? DEFAULT_CONFIG.logging.level,
      format: parsed.logging?.format ?? DEFAULT_CONFIG.logging.format,
    },
    artifacts: {
      outputDir: parsed.artifacts?.outputDir ?? DEFAULT_CONFIG.artifacts.outputDir,
    },
    extensions: parsed.extensions !== undefined ? [...parsed.extensions] : [...DEFAULT_CONFIG.extensions],
  };

  if (parsed.baseUrl !== undefined) {
    resolved.baseUrl = parsed.baseUrl;
  }

  return resolved;
}
