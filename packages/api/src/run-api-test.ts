import {
  ServiceKeys,
  runQakitTest,
  type ConfigLayer,
  type EnvMap,
  type ExecutionSummary,
  type ResolvedConfig,
  type RunQakitTestOptions,
  type TestContext,
} from '@qakit/core';
import { registerApi, type ApiExtensionOptions } from './create-api-extension.js';
import type { ApiClient } from './create-api-client.js';

export interface ApiTestFixtures {
  api: ApiClient;
  ctx: TestContext;
}

export interface RunApiTestOptions {
  cwd?: string;
  env?: EnvMap;
  overrides?: ConfigLayer;
  config?: ResolvedConfig;
  testId?: string;
  testFile?: string;
  tags?: string[];
  attempt?: number;
  throwOnFailure?: boolean;
  saveArtifacts?: boolean;
  defaultTimeout?: number;
  auth?: ApiExtensionOptions['auth'];
  register?: RunQakitTestOptions['register'];
}

function apiOptions(options: RunApiTestOptions | undefined): ApiExtensionOptions {
  const resolved: ApiExtensionOptions = {};
  if (options?.saveArtifacts === true) {
    resolved.saveArtifacts = true;
  }
  if (options?.defaultTimeout !== undefined) {
    resolved.defaultTimeout = options.defaultTimeout;
  }
  if (options?.auth !== undefined) {
    resolved.auth = options.auth;
  }
  return resolved;
}

function toRunOptions(
  name: string,
  options: RunApiTestOptions | undefined,
  register: NonNullable<RunQakitTestOptions['register']>,
): RunQakitTestOptions {
  const runOptions: RunQakitTestOptions = {
    name,
    run: async () => undefined,
    register,
  };
  if (options?.cwd !== undefined) {
    runOptions.cwd = options.cwd;
  }
  if (options?.env !== undefined) {
    runOptions.env = options.env;
  }
  if (options?.overrides !== undefined) {
    runOptions.overrides = options.overrides;
  }
  if (options?.config !== undefined) {
    runOptions.config = options.config;
  }
  if (options?.testId !== undefined) {
    runOptions.testId = options.testId;
  }
  if (options?.testFile !== undefined) {
    runOptions.testFile = options.testFile;
  }
  if (options?.tags !== undefined) {
    runOptions.tags = options.tags;
  }
  if (options?.attempt !== undefined) {
    runOptions.attempt = options.attempt;
  }
  if (options?.throwOnFailure !== undefined) {
    runOptions.throwOnFailure = options.throwOnFailure;
  }
  return runOptions;
}

/**
 * Same lifecycle as the long `registerApi` example. Returns `ExecutionSummary`.
 * Does not wrap Vitest — use `apiTest` from `@qakit/api/test`.
 */
export async function runApiTest(
  name: string,
  fn: (fixtures: ApiTestFixtures) => Promise<void>,
  options?: RunApiTestOptions,
): Promise<ExecutionSummary> {
  const runOptions = toRunOptions(name, options, async (manager, config) => {
    registerApi(manager, apiOptions(options));
    if (options?.register !== undefined) {
      await options.register(manager, config);
    }
  });
  runOptions.run = async (ctx) => {
    await fn({
      api: ctx.services.get<ApiClient>(ServiceKeys.ApiClient),
      ctx,
    });
  };
  return runQakitTest(runOptions);
}
