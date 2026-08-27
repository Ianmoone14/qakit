import { z } from 'zod';
import type { Extension } from './extension.js';
import { LOG_FORMATS, LOG_LEVELS } from './logging.js';

export const PROJECT_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const extensionSchema: z.ZodType<Extension> = z.custom<Extension>(
  (value) => {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const candidate = value as { name?: unknown; version?: unknown };
    return typeof candidate.name === 'string' && typeof candidate.version === 'string';
  },
  { message: 'Each extension must have string name and version' },
);

export const retryConfigSchema = z.object({
  attempts: z.number().int().min(0).max(10),
  delay: z.number().int().min(0),
});

export const loggingConfigSchema = z.object({
  level: z.enum(LOG_LEVELS),
  format: z.enum(LOG_FORMATS),
});

export const artifactsConfigSchema = z.object({
  outputDir: z.string().min(1),
});

export const qakitConfigSchema = z.object({
  project: z
    .string()
    .min(1)
    .regex(PROJECT_NAME_PATTERN, 'project must be lowercase kebab-case (e.g. checkout-api)'),
  environment: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
  retry: retryConfigSchema.optional(),
  logging: loggingConfigSchema.optional(),
  artifacts: artifactsConfigSchema.optional(),
  extensions: z.array(extensionSchema).optional(),
});

export type QakitConfig = z.input<typeof qakitConfigSchema>;

export interface ResolvedRetryConfig {
  attempts: number;
  delay: number;
}

export interface ResolvedLoggingConfig {
  level: z.infer<typeof loggingConfigSchema>['level'];
  format: z.infer<typeof loggingConfigSchema>['format'];
}

export interface ResolvedArtifactsConfig {
  outputDir: string;
}

export interface ResolvedConfig {
  project: string;
  environment: string;
  retry: ResolvedRetryConfig;
  logging: ResolvedLoggingConfig;
  artifacts: ResolvedArtifactsConfig;
  extensions: Extension[];
  baseUrl?: string;
}

export const DEFAULT_CONFIG = {
  environment: 'development',
  retry: { attempts: 0, delay: 0 },
  logging: { level: 'info' as const, format: 'pretty' as const },
  artifacts: { outputDir: 'artifacts' },
  extensions: [] as Extension[],
} satisfies Omit<ResolvedConfig, 'project' | 'baseUrl'>;
