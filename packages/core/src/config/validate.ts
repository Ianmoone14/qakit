import type { Extension, ResolvedConfig } from '@qakit/contracts';
import {
  ConfigurationError,
  DEFAULT_CONFIG,
  artifactsConfigSchema,
  loggingConfigSchema,
  qakitConfigSchema,
  retryConfigSchema,
} from '@qakit/contracts';
import { z } from 'zod';

const resolvedConfigSchema = qakitConfigSchema.extend({
  environment: z.string().min(1),
  retry: retryConfigSchema,
  logging: loggingConfigSchema,
  artifacts: artifactsConfigSchema,
  extensions: z.array(z.custom<Extension>()),
});

export function validateConfig(config: unknown): ResolvedConfig {
  const parsed = resolvedConfigSchema.safeParse(config);
  if (!parsed.success) {
    throw new ConfigurationError('Configuration validation failed', {
      code: 'CONFIG_VALIDATION_FAILED',
      context: {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.') || '(root)',
          message: issue.message,
        })),
      },
      cause: parsed.error,
    });
  }

  const resolved: ResolvedConfig = {
    project: parsed.data.project,
    environment: parsed.data.environment,
    retry: parsed.data.retry,
    logging: parsed.data.logging,
    artifacts: parsed.data.artifacts,
    extensions: parsed.data.extensions,
  };
  if (parsed.data.baseUrl !== undefined) {
    resolved.baseUrl = parsed.data.baseUrl;
  }
  return resolved;
}

export { DEFAULT_CONFIG };
