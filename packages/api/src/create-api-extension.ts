import {
  LifecycleManager,
  ServiceKeys,
  type AuthProvider,
  type Extension,
  type LifecycleHookOptions,
  type LifecyclePhase,
} from '@qakit/core';
import { createApiClient, isAuthProvider, type ApiClientOptions } from './create-api-client.js';
import { API_PACKAGE, API_VERSION } from './package-info.js';

export type ApiExtensionOptions = ApiClientOptions;

const HOOK_TIMEOUTS: Partial<Record<LifecyclePhase, LifecycleHookOptions>> = {
  beforeTest: { timeout: 30_000, critical: true },
};

export function createApiExtension(options: ApiExtensionOptions = {}): Extension {
  return {
    name: API_PACKAGE,
    version: API_VERSION,
    hooks: {
      async beforeTest(ctx) {
        const registered = ctx.services.tryGet<unknown>(ServiceKeys.Auth);
        const fromRegistry = isAuthProvider(registered) ? registered : undefined;
        const auth: AuthProvider | undefined = options.auth ?? fromRegistry;
        const clientOptions: ApiClientOptions = {};
        if (auth !== undefined) {
          clientOptions.auth = auth;
        }
        if (options.saveArtifacts === true) {
          clientOptions.saveArtifacts = true;
        }
        if (options.defaultTimeout !== undefined) {
          clientOptions.defaultTimeout = options.defaultTimeout;
        }
        ctx.services.register(ServiceKeys.ApiClient, createApiClient(ctx, clientOptions));
      },
    },
  };
}

export function registerApi(manager: LifecycleManager, options?: ApiExtensionOptions): void {
  manager.registerExtension(createApiExtension(options), HOOK_TIMEOUTS);
}
