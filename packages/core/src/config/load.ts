import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { QakitConfig } from '@qakit/contracts';
import { ConfigurationError, qakitConfigSchema } from '@qakit/contracts';
import { createJiti } from 'jiti';

const CONFIG_FILENAMES = [
  'qakit.config.ts',
  'qakit.config.mts',
  'qakit.config.js',
  'qakit.config.mjs',
] as const;

export function findConfigFile(cwd: string): string | undefined {
  for (const name of CONFIG_FILENAMES) {
    const candidate = join(cwd, name);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function unwrapModule(loaded: unknown): unknown {
  if (typeof loaded === 'object' && loaded !== null && 'default' in loaded) {
    const withDefault = loaded as { default: unknown };
    if (withDefault.default !== undefined) {
      return withDefault.default;
    }
  }
  return loaded;
}

export async function loadConfig(cwd: string = process.cwd()): Promise<QakitConfig | undefined> {
  const file = findConfigFile(cwd);
  if (file === undefined) {
    return undefined;
  }

  try {
    const jiti = createJiti(import.meta.url);
    const loaded = unwrapModule(await jiti.import(file));
    const parsed = qakitConfigSchema.safeParse(loaded);
    if (!parsed.success) {
      throw new ConfigurationError(`Invalid configuration in ${file}`, {
        code: 'INVALID_CONFIG_FILE',
        context: { file, issues: parsed.error.issues },
        cause: parsed.error,
      });
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    try {
      const native = unwrapModule(await import(pathToFileURL(file).href));
      const parsed = qakitConfigSchema.safeParse(native);
      if (!parsed.success) {
        throw new ConfigurationError(`Invalid configuration in ${file}`, {
          code: 'INVALID_CONFIG_FILE',
          context: { file, issues: parsed.error.issues },
          cause: parsed.error,
        });
      }
      return parsed.data;
    } catch (fallbackError) {
      throw new ConfigurationError(`Failed to load configuration from ${file}`, {
        code: 'CONFIG_LOAD_FAILED',
        context: { file },
        cause: fallbackError,
      });
    }
  }
}
