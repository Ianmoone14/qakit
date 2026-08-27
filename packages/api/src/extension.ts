import type { Extension } from '@qakit/contracts';
import { createApiClient } from './client.js';
import { ApiServiceKeys } from './keys.js';
import type { ApiConfig } from './types.js';
import { API_EXTENSION_VERSION } from './types.js';

export function apiExtension(config: ApiConfig = {}): Extension {
  return {
    name: 'api',
    version: API_EXTENSION_VERSION,
    hooks: {
      beforeExecution: async (ctx): Promise<void> => {
        const client = createApiClient(ctx, {
          ...config,
          ...(config.baseUrl === undefined && ctx.config.baseUrl !== undefined
            ? { baseUrl: ctx.config.baseUrl }
            : {}),
        });
        ctx.services.register(ApiServiceKeys.Client, client);
        ctx.logger.debug('API client registered');
      },
    },
  };
}
