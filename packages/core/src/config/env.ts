import type { LogLevel, QakitConfig } from '@qakit/contracts';
import { LOG_LEVELS } from '@qakit/contracts';

export interface EnvConfigSlice {
  project?: string;
  environment?: string;
  logging?: { level: LogLevel };
}

export function readEnvConfig(env: NodeJS.ProcessEnv): EnvConfigSlice {
  const slice: EnvConfigSlice = {};
  const project = env.QAKIT_PROJECT;
  const environment = env.QAKIT_ENVIRONMENT;
  const logLevel = env.QAKIT_LOG_LEVEL;

  if (project !== undefined && project !== '') {
    slice.project = project;
  }
  if (environment !== undefined && environment !== '') {
    slice.environment = environment;
  }
  if (logLevel !== undefined && logLevel !== '') {
    if ((LOG_LEVELS as readonly string[]).includes(logLevel)) {
      slice.logging = { level: logLevel as LogLevel };
    }
  }
  return slice;
}

export function isCiEnvironment(env: NodeJS.ProcessEnv): boolean {
  return env.CI === 'true' || env.GITLAB_CI === 'true' || env.GITHUB_ACTIONS === 'true';
}

export type PartialConfig = QakitConfig | EnvConfigSlice;
