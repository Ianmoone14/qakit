import type { LogLevel } from '@qakit/contracts';
import type { ConfigLayer, EnvMap } from './types.js';

function read(env: EnvMap, key: string): string | undefined {
  const value = env[key];
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  return value;
}

/**
 * Maps known `QAKIT_*` variables onto a config overlay.
 * Invalid log levels are passed through so Zod can reject them after merge.
 */
export function envOverlay(env: EnvMap): ConfigLayer {
  const layer: ConfigLayer = {};
  const project = read(env, 'QAKIT_PROJECT');
  if (project !== undefined) {
    layer.project = project;
  }
  const environment = read(env, 'QAKIT_ENVIRONMENT');
  if (environment !== undefined) {
    layer.environment = environment;
  }
  const logLevel = read(env, 'QAKIT_LOG_LEVEL');
  if (logLevel !== undefined) {
    layer.logging = { level: logLevel as LogLevel };
  }
  return layer;
}
