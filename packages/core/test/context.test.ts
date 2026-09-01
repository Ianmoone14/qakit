import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTRACTS_PACKAGE, CONTRACTS_VERSION, FrameworkError } from '@qakit/contracts';
import { describe, expect, it } from 'vitest';
import {
  CORE_PACKAGE,
  CORE_VERSION,
  MemoryServiceRegistry,
  createExecutionContext,
  createTestContext,
  resolveConfig,
} from '../src/index.js';
import { memoryArtifacts, silentLogger } from './helpers.js';

const emptyEnv = {};

function baseConfig() {
  return resolveConfig({ file: { project: 'checkout-api' }, env: emptyEnv });
}

describe('createExecutionContext', () => {
  it('assigns a unique ULID per run', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      const ctx = createExecutionContext({
        config: baseConfig(),
        logger: silentLogger(),
        artifacts: memoryArtifacts(),
        env: emptyEnv,
      });
      expect(ctx.executionId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/i);
      ids.add(ctx.executionId);
    }
    expect(ids.size).toBe(20);
  });

  it('copies project and environment from resolved config', () => {
    const config = resolveConfig({
      file: { project: 'checkout-api', environment: 'staging' },
      env: emptyEnv,
    });
    const now = new Date('2026-08-31T10:00:00.000Z');
    const logger = silentLogger();
    const artifacts = memoryArtifacts();
    const ctx = createExecutionContext({
      config,
      logger,
      artifacts,
      env: emptyEnv,
      now,
      executionId: '01TESTID000000000000000000',
    });

    expect(ctx.project).toBe('checkout-api');
    expect(ctx.environment).toBe('staging');
    expect(ctx.config).toBe(config);
    expect(ctx.logger).toBe(logger);
    expect(ctx.artifacts).toBe(artifacts);
    expect(ctx.startTime).toBe(now);
    expect(ctx.executionId).toBe('01TESTID000000000000000000');
    expect(ctx.framework).toEqual({
      name: 'qakit',
      version: CORE_VERSION,
      packages: {
        [CORE_PACKAGE]: CORE_VERSION,
        [CONTRACTS_PACKAGE]: CONTRACTS_VERSION,
      },
    });
  });

  it('detects GitLab CI from env', () => {
    const ctx = createExecutionContext({
      config: baseConfig(),
      logger: silentLogger(),
      artifacts: memoryArtifacts(),
      env: {
        GITLAB_CI: 'true',
        CI_COMMIT_SHA: 'abc123',
        CI_PIPELINE_ID: '99',
        CI_JOB_ID: '7',
        CI_COMMIT_REF_NAME: 'main',
      },
    });
    expect(ctx.ci?.provider).toBe('gitlab');
    expect(ctx.ci?.commitSha).toBe('abc123');
    expect(ctx.ci?.pipelineId).toBe('99');
    expect(ctx.ci?.jobId).toBe('7');
    expect(ctx.ci?.branch).toBe('main');
    expect(ctx.ci?.raw.GITLAB_CI).toBe('true');
  });

  it('detects GitHub Actions from env', () => {
    const ctx = createExecutionContext({
      config: baseConfig(),
      logger: silentLogger(),
      artifacts: memoryArtifacts(),
      env: {
        GITHUB_ACTIONS: 'true',
        GITHUB_SHA: 'def456',
        GITHUB_RUN_ID: '10',
        GITHUB_JOB: 'test',
        GITHUB_REF_NAME: 'feat/x',
      },
    });
    expect(ctx.ci?.provider).toBe('github');
    expect(ctx.ci?.commitSha).toBe('def456');
    expect(ctx.ci?.pipelineId).toBe('10');
    expect(ctx.ci?.jobId).toBe('test');
    expect(ctx.ci?.branch).toBe('feat/x');
  });

  it('falls back to generic CI with a raw env map', () => {
    const ctx = createExecutionContext({
      config: baseConfig(),
      logger: silentLogger(),
      artifacts: memoryArtifacts(),
      env: { CI: 'true', QAKIT_ENVIRONMENT: 'staging' },
    });
    expect(ctx.ci?.provider).toBe('generic');
    expect(ctx.ci?.raw.CI).toBe('true');
    expect(ctx.ci?.raw.QAKIT_ENVIRONMENT).toBe('staging');
    expect(ctx.ci?.commitSha).toBeUndefined();
  });
});

describe('createTestContext', () => {
  it('inherits execution fields and fills attempt/tags defaults', () => {
    const execution = createExecutionContext({
      config: baseConfig(),
      logger: silentLogger(),
      artifacts: memoryArtifacts(),
      env: emptyEnv,
    });
    const test = createTestContext(execution, {
      testId: 't1',
      testName: 'adds to cart',
      testFile: 'cart.test.ts',
    });

    expect(test.executionId).toBe(execution.executionId);
    expect(test.project).toBe(execution.project);
    expect(test.config).toBe(execution.config);
    expect(test.logger).toBe(execution.logger);
    expect(test.artifacts).toBe(execution.artifacts);
    expect(test.services).toBe(execution.services);
    expect(test.testId).toBe('t1');
    expect(test.testName).toBe('adds to cart');
    expect(test.testFile).toBe('cart.test.ts');
    expect(test.attempt).toBe(1);
    expect(test.tags).toEqual([]);
  });
});

describe('MemoryServiceRegistry', () => {
  it('registers and returns services without Playwright types on context', () => {
    const services = new MemoryServiceRegistry();
    const page = { goto: () => undefined };
    services.register('qakit.playwright.page', page);
    expect(services.has('qakit.playwright.page')).toBe(true);
    expect(services.get('qakit.playwright.page')).toBe(page);
    expect(services.tryGet('missing')).toBeUndefined();
    expect(() => services.get('missing')).toThrow(FrameworkError);
  });
});

describe('@qakit/core package boundary', () => {
  it('does not depend on Playwright', () => {
    const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
    expect(names.some((name) => name.toLowerCase().includes('playwright'))).toBe(false);
  });
});
