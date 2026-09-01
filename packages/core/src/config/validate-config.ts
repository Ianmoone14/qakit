import { ConfigurationError, qakitConfigSchema, type QakitConfig } from '@qakit/contracts';
import { CONFIG_ERROR_CODES } from './codes.js';

interface SchemaIssue {
  path: PropertyKey[];
  message: string;
  code: string;
}

interface SchemaError {
  issues: SchemaIssue[];
}

export function validateConfig(config: unknown): QakitConfig {
  const result = qakitConfigSchema.safeParse(config);
  if (!result.success) {
    throw configurationErrorFromZod(result.error);
  }
  return result.data;
}

export function configurationErrorFromZod(error: SchemaError): ConfigurationError {
  const issue = error.issues[0];
  const path = issue?.path[0];
  let code: string = CONFIG_ERROR_CODES.INVALID_CONFIG;

  if (path === 'project') {
    code =
      issue?.code === 'invalid_type' || issue?.code === 'too_small'
        ? CONFIG_ERROR_CODES.MISSING_PROJECT
        : CONFIG_ERROR_CODES.INVALID_PROJECT;
  } else if (path === 'baseUrl') {
    code = CONFIG_ERROR_CODES.INVALID_BASE_URL;
  } else if (path === 'logging') {
    code = CONFIG_ERROR_CODES.INVALID_LOGGING;
  } else if (path === 'retry') {
    code = CONFIG_ERROR_CODES.INVALID_RETRY;
  } else if (path === 'artifacts') {
    code = CONFIG_ERROR_CODES.INVALID_ARTIFACTS;
  } else if (path === 'extensions') {
    code = CONFIG_ERROR_CODES.INVALID_EXTENSIONS;
  }

  const message = issue
    ? `Invalid config at "${issue.path.join('.') || 'root'}": ${issue.message}`
    : 'Invalid config';

  return new ConfigurationError(message, {
    code,
    context: {
      issues: error.issues.map((item) => ({
        path: item.path.join('.'),
        message: item.message,
      })),
    },
    cause: error,
  });
}
