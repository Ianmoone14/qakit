import { existsSync } from 'node:fs';
import path from 'node:path';
import { ConfigurationError, type ResolvedConfig } from '@qakit/contracts';
import { createJiti } from 'jiti';
import { CONFIG_ERROR_CODES } from './codes.js';
import { resolveConfig } from './resolve-config.js';
import type { ConfigLayer, LoadConfigOptions } from './types.js';

const DEFAULT_FILE_NAME = 'qakit.config.ts';

export async function loadConfig(options: LoadConfigOptions = {}): Promise<ResolvedConfig> {
  const cwd = options.cwd ?? process.cwd();
  const filePath = options.path === undefined ? path.join(cwd, DEFAULT_FILE_NAME) : path.resolve(cwd, options.path);

  if (!existsSync(filePath)) {
    throw new ConfigurationError(`Config file not found: ${filePath}`, {
      code: CONFIG_ERROR_CODES.CONFIG_FILE_NOT_FOUND,
      context: { path: filePath },
    });
  }

  const file = await importConfigFile(filePath);
  return resolveConfig({
    file,
    ...(options.env !== undefined ? { env: options.env } : {}),
    ...(options.overrides !== undefined ? { overrides: options.overrides } : {}),
  });
}

async function importConfigFile(filePath: string): Promise<ConfigLayer> {
  const jiti = createJiti(import.meta.url, { moduleCache: false });

  let imported: unknown;
  try {
    imported = await jiti.import(filePath);
  } catch (cause) {
    throw new ConfigurationError(`Failed to load config file: ${filePath}`, {
      code: CONFIG_ERROR_CODES.CONFIG_FILE_INVALID,
      context: { path: filePath },
      cause,
    });
  }

  if (typeof imported !== 'object' || imported === null || !('default' in imported)) {
    throw new ConfigurationError('Config file must default-export a plain object', {
      code: CONFIG_ERROR_CODES.CONFIG_FILE_INVALID,
      context: { path: filePath },
    });
  }

  const config = unwrapDefaultExport((imported as { default: unknown }).default);
  if (!isPlainObject(config)) {
    throw new ConfigurationError('Config file must default-export a plain object', {
      code: CONFIG_ERROR_CODES.CONFIG_FILE_INVALID,
      context: { path: filePath },
    });
  }

  return config as ConfigLayer;
}

function unwrapDefaultExport(exported: unknown): unknown {
  if (
    typeof exported === 'object' &&
    exported !== null &&
    'default' in exported &&
    (exported as { default: unknown }).default !== exported
  ) {
    return (exported as { default: unknown }).default;
  }
  return exported;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
