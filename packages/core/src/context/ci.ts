import type { CIContext } from '@qakit/contracts';

function pick(env: NodeJS.ProcessEnv, keys: readonly string[]): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const key of keys) {
    const value = env[key];
    if (value !== undefined && value !== '') {
      raw[key] = value;
    }
  }
  return raw;
}

function withOptional(target: CIContext, key: keyof CIContext, value: string | undefined): void {
  if (value !== undefined && value !== '' && key !== 'provider' && key !== 'raw') {
    (target as unknown as Record<string, string>)[key] = value;
  }
}

export function detectCI(env: NodeJS.ProcessEnv = process.env): CIContext | undefined {
  if (env.GITLAB_CI === 'true' || (env.CI_PIPELINE_ID !== undefined && env.CI_PIPELINE_ID !== '')) {
    const ctx: CIContext = {
      provider: 'gitlab',
      raw: pick(env, ['CI_COMMIT_SHA', 'CI_PIPELINE_ID', 'CI_JOB_ID', 'CI_COMMIT_BRANCH']),
    };
    withOptional(ctx, 'commitSha', env.CI_COMMIT_SHA);
    withOptional(ctx, 'pipelineId', env.CI_PIPELINE_ID);
    withOptional(ctx, 'jobId', env.CI_JOB_ID);
    withOptional(ctx, 'branch', env.CI_COMMIT_BRANCH);
    return ctx;
  }

  if (env.GITHUB_ACTIONS === 'true') {
    const ctx: CIContext = {
      provider: 'github',
      raw: pick(env, ['GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_JOB', 'GITHUB_REF_NAME']),
    };
    withOptional(ctx, 'commitSha', env.GITHUB_SHA);
    withOptional(ctx, 'pipelineId', env.GITHUB_RUN_ID);
    withOptional(ctx, 'jobId', env.GITHUB_JOB);
    withOptional(ctx, 'branch', env.GITHUB_REF_NAME);
    return ctx;
  }

  if (env.CI === 'true') {
    return { provider: 'generic', raw: {} };
  }

  return undefined;
}
