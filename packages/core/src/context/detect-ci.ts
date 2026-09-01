import type { CIContext } from '@qakit/contracts';
import type { EnvMap } from '../config/types.js';

const RAW_KEYS = [
  'CI',
  'GITLAB_CI',
  'CI_COMMIT_SHA',
  'CI_PIPELINE_ID',
  'CI_JOB_ID',
  'CI_COMMIT_REF_NAME',
  'GITHUB_ACTIONS',
  'GITHUB_SHA',
  'GITHUB_RUN_ID',
  'GITHUB_JOB',
  'GITHUB_REF_NAME',
  'GITHUB_REF',
  'QAKIT_PROJECT',
  'QAKIT_ENVIRONMENT',
  'QAKIT_LOG_LEVEL',
] as const;

function isSet(value: string | undefined): value is string {
  return value !== undefined && value !== '';
}

function flag(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const normalized = value.toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function collectRaw(env: EnvMap): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const key of RAW_KEYS) {
    const value = env[key];
    if (isSet(value)) {
      raw[key] = value;
    }
  }
  return raw;
}

function withFields(
  base: CIContext,
  fields: {
    commitSha?: string;
    pipelineId?: string;
    jobId?: string;
    branch?: string;
  },
): CIContext {
  if (fields.commitSha !== undefined) {
    base.commitSha = fields.commitSha;
  }
  if (fields.pipelineId !== undefined) {
    base.pipelineId = fields.pipelineId;
  }
  if (fields.jobId !== undefined) {
    base.jobId = fields.jobId;
  }
  if (fields.branch !== undefined) {
    base.branch = fields.branch;
  }
  return base;
}

export function detectCIContext(env: EnvMap): CIContext {
  const raw = collectRaw(env);

  if (flag(env.GITLAB_CI)) {
    return withFields(
      { provider: 'gitlab', raw },
      {
        ...(isSet(env.CI_COMMIT_SHA) ? { commitSha: env.CI_COMMIT_SHA } : {}),
        ...(isSet(env.CI_PIPELINE_ID) ? { pipelineId: env.CI_PIPELINE_ID } : {}),
        ...(isSet(env.CI_JOB_ID) ? { jobId: env.CI_JOB_ID } : {}),
        ...(isSet(env.CI_COMMIT_REF_NAME) ? { branch: env.CI_COMMIT_REF_NAME } : {}),
      },
    );
  }

  if (flag(env.GITHUB_ACTIONS)) {
    return withFields(
      { provider: 'github', raw },
      {
        ...(isSet(env.GITHUB_SHA) ? { commitSha: env.GITHUB_SHA } : {}),
        ...(isSet(env.GITHUB_RUN_ID) ? { pipelineId: env.GITHUB_RUN_ID } : {}),
        ...(isSet(env.GITHUB_JOB) ? { jobId: env.GITHUB_JOB } : {}),
        ...(isSet(env.GITHUB_REF_NAME) ? { branch: env.GITHUB_REF_NAME } : {}),
      },
    );
  }

  return { provider: 'generic', raw };
}
