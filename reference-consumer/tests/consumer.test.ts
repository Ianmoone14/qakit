import { expect, test } from 'vitest';
import { createExecutionContext, createLifecycleManager, resolveConfig } from '@qakit/core';
import config from '../qakit.config.js';

test('reference consumer can resolve the published config', () => {
  const resolved = resolveConfig({
    loaded: config,
    env: {},
    overrides: { logging: { level: 'error', format: 'json' } },
  });
  expect(resolved.project).toBe('example-project');
  expect(resolved.extensions.map((extension) => extension.name)).toEqual(['playwright', 'api']);
});

test('reference consumer can create an execution and register extension hooks', async () => {
  const resolved = resolveConfig({
    loaded: config,
    env: {},
    overrides: { logging: { level: 'error', format: 'json' } },
  });
  const ctx = createExecutionContext({ config: resolved, env: {} });
  const lifecycle = createLifecycleManager(resolved.extensions);
  await lifecycle.execute('beforeExecution', ctx);
  expect(ctx.services.has('qakit.api.client')).toBe(true);
  expect(ctx.framework.packages['@qakit/core']).toBeDefined();
});
