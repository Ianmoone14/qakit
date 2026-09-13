import {
  FrameworkError,
  ServiceKeys,
  runQakitTest,
  type ConfigLayer,
  type EnvMap,
  type ExecutionSummary,
  type LifecycleManager,
  type ResolvedConfig,
  type RunQakitTestOptions,
  type TestContext,
} from '@qakit/core';
import type { Page } from 'playwright';
import { registerPlaywright, type PlaywrightExtensionOptions } from './create-playwright-extension.js';

/** Structural client so this package does not depend on `@qakit/api` types. */
export interface UiApiClient {
  request(input: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
    url: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  }): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
  }>;
}

export interface UiTestFixtures<TApi = UiApiClient> {
  page: Page;
  ctx: TestContext;
  /** Present when `@qakit/api` was registered (default if that package is installed). */
  api?: TApi;
}

export type UiTestApiOption =
  | boolean
  | {
      saveArtifacts?: boolean;
      defaultTimeout?: number;
    };

export interface RunUiTestOptions {
  cwd?: string;
  env?: EnvMap;
  overrides?: ConfigLayer;
  config?: ResolvedConfig;
  testId?: string;
  testFile?: string;
  tags?: string[];
  attempt?: number;
  throwOnFailure?: boolean;
  headless?: boolean;
  screenshotOnFailure?: boolean;
  traceOnFailure?: boolean;
  /**
   * Register `@qakit/api` when the package can be imported (default).
   * `false` skips it. `true` or options fail if the package is missing.
   */
  api?: UiTestApiOption;
  /** Extra adapters (Appium, mocks, reporters) after Playwright / API. */
  register?: RunQakitTestOptions['register'];
}

async function registerOptionalApi(
  manager: LifecycleManager,
  api: UiTestApiOption | undefined,
): Promise<void> {
  if (api === false) {
    return;
  }

  const requested = api !== undefined;
  try {
    const { registerApi } = await import('@qakit/api');
    if (api === true || api === undefined) {
      registerApi(manager);
      return;
    }
    registerApi(manager, api);
  } catch (cause) {
    if (requested) {
      throw new FrameworkError('uiTest requested API but @qakit/api is not installed', {
        code: 'API_PACKAGE_MISSING',
        cause,
      });
    }
  }
}

function playwrightOverrides(options: RunUiTestOptions | undefined): PlaywrightExtensionOptions {
  const resolved: PlaywrightExtensionOptions = {};
  if (options?.headless !== undefined) {
    resolved.headless = options.headless;
  }
  if (options?.screenshotOnFailure !== undefined) {
    resolved.screenshotOnFailure = options.screenshotOnFailure;
  }
  if (options?.traceOnFailure !== undefined) {
    resolved.traceOnFailure = options.traceOnFailure;
  }
  if (options?.cwd !== undefined) {
    resolved.cwd = options.cwd;
  }
  return resolved;
}

function toRunOptions(
  name: string,
  options: RunUiTestOptions | undefined,
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
 * Same lifecycle as the long `registerPlaywright` example. Returns `ExecutionSummary`
 * so the caller can print it. Does not wrap Vitest — use `uiTest` from `@qakit/playwright/test`.
 */
export async function runUiTest<TApi = UiApiClient>(
  name: string,
  fn: (fixtures: UiTestFixtures<TApi>) => Promise<void>,
  options?: RunUiTestOptions,
): Promise<ExecutionSummary> {
  const runOptions = toRunOptions(name, options, async (manager, config) => {
    registerPlaywright(manager, playwrightOverrides(options));
    await registerOptionalApi(manager, options?.api);
    if (options?.register !== undefined) {
      await options.register(manager, config);
    }
  });
  runOptions.run = async (ctx) => {
    const fixtures: UiTestFixtures<TApi> = {
      page: ctx.services.get<Page>(ServiceKeys.PlaywrightPage),
      ctx,
    };
    const api = ctx.services.tryGet<TApi>(ServiceKeys.ApiClient);
    if (api !== undefined) {
      fixtures.api = api;
    }
    await fn(fixtures);
  };
  return runQakitTest(runOptions);
}
