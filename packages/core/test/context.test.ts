import { describe, expect, it } from 'vitest';
import { detectCI } from '../src/context/ci.js';
import { createExecutionContext } from '../src/context/execution.js';
import { createTestContext } from '../src/context/test.js';
import { resolveConfig } from '../src/config/resolve.js';

function config() {
  return resolveConfig({
    loaded: { project: 'context-project' },
    env: {},
    overrides: { logging: { level: 'error', format: 'json' } },
  });
}

describe('detectCI', () => {
  it('reads GitLab variables', () => {
    const ci = detectCI({
      GITLAB_CI: 'true',
      CI_COMMIT_SHA: 'abc123',
      CI_PIPELINE_ID: '99',
      CI_JOB_ID: '12',
      CI_COMMIT_BRANCH: 'main',
    });
    expect(ci?.provider).toBe('gitlab');
    expect(ci?.commitSha).toBe('abc123');
    expect(ci?.pipelineId).toBe('99');
    expect(ci?.jobId).toBe('12');
    expect(ci?.branch).toBe('main');
  });

  it('returns undefined when not in CI', () => {
    expect(detectCI({})).toBeUndefined();
  });
});

describe('execution and test context', () => {
  it('creates an execution with ULID, version, and services', () => {
    const ctx = createExecutionContext({
      config: config(),
      env: { CI_PIPELINE_ID: '1', CI_COMMIT_SHA: 'deadbeef' },
    });
    expect(ctx.executionId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/i);
    expect(ctx.project).toBe('context-project');
    expect(ctx.framework.packages['@qakit/core']).toBeDefined();
    expect(ctx.ci?.provider).toBe('gitlab');
    expect(ctx.services.has('missing')).toBe(false);
  });

  it('creates a child test context', () => {
    const exec = createExecutionContext({ config: config(), env: {} });
    const test = createTestContext(exec, {
      testId: 't1',
      testName: 'homepage loads',
      testFile: 'tests/ui/example.spec.ts',
      tags: ['smoke'],
    });
    expect(test.executionId).toBe(exec.executionId);
    expect(test.testId).toBe('t1');
    expect(test.attempt).toBe(1);
    expect(test.tags).toEqual(['smoke']);
  });
});
