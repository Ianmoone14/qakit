import type { Extension, LogFormat, LogLevel } from '@qakit/contracts';

/** One overlay in the merge chain. All fields optional so env/runtime can be partial. */
export interface ConfigLayer {
  project?: string;
  environment?: string;
  baseUrl?: string;
  retry?: {
    attempts?: number;
    delay?: number;
  };
  logging?: {
    level?: LogLevel;
    format?: LogFormat;
  };
  artifacts?: {
    outputDir?: string;
  };
  extensions?: Extension[];
}

export type EnvMap = Record<string, string | undefined>;

export interface ResolveConfigInput {
  /** Parsed `qakit.config.ts` (or any overlay). */
  file?: ConfigLayer;
  /**
   * Environment map. If omitted, `process.env` is used.
   * Pass `{}` in tests to ignore the machine environment.
   */
  env?: EnvMap;
  /** Runtime / CLI overrides. Strongest layer. */
  overrides?: ConfigLayer;
}

export interface LoadConfigOptions extends ResolveConfigInput {
  /** Directory to look for `qakit.config.ts`. Default: `process.cwd()`. */
  cwd?: string;
  /** Explicit config file path (absolute or relative to `cwd`). */
  path?: string;
}
