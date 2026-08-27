import type { AuthProvider, ExecutionContext } from '@qakit/contracts';
import { IntegrationError, TimeoutError } from '@qakit/contracts';
import { redactValue } from '@qakit/core';
import { ApiServiceKeys } from './keys.js';
import type { ApiConfig, ApiResponse, RequestOptions } from './types.js';
import { DEFAULT_API_TIMEOUT_MS } from './types.js';

export interface ApiClient {
  request(options: RequestOptions): Promise<ApiResponse>;
}

function resolveUrl(url: string, baseUrl: string | undefined): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (baseUrl === undefined || baseUrl === '') {
    throw new IntegrationError(`Cannot resolve relative URL '${url}' without a baseUrl`, {
      code: 'API_BASE_URL_MISSING',
      context: { url },
    });
  }
  return new URL(url, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

function headerRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function serializeBody(body: unknown): { payload?: BodyInit; contentType?: string } {
  if (body === undefined) {
    return {};
  }
  if (typeof body === 'string' || body instanceof Uint8Array) {
    return { payload: body as BodyInit };
  }
  return { payload: JSON.stringify(body), contentType: 'application/json' };
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

function summarizeBody(body: unknown): unknown {
  const redacted = redactValue(body);
  try {
    const serialized = JSON.stringify(redacted);
    if (serialized !== undefined && serialized.length > 8_000) {
      return { truncated: true, preview: serialized.slice(0, 8_000) };
    }
  } catch {
    return '[unserializable]';
  }
  return redacted;
}

export function createApiClient(ctx: ExecutionContext, config: ApiConfig = {}): ApiClient {
  return {
    async request(options: RequestOptions): Promise<ApiResponse> {
      const started = Date.now();
      const method = (options.method ?? 'GET').toUpperCase();
      const url = resolveUrl(options.url, config.baseUrl ?? ctx.config.baseUrl);
      const auth = ctx.services.tryGet<AuthProvider>(ApiServiceKeys.Auth);
      const authHeaders = auth !== undefined ? await auth.getHeaders(ctx) : {};
      const headers: Record<string, string> = {
        ...config.defaultHeaders,
        ...authHeaders,
        ...options.headers,
      };
      const serialized = serializeBody(options.body);
      if (serialized.contentType !== undefined && headers['content-type'] === undefined) {
        headers['content-type'] = serialized.contentType;
      }

      ctx.logger.info('API request', {
        method,
        url,
        headers: redactValue(headers),
        body: summarizeBody(options.body),
      });

      const timeoutMs = options.timeout ?? config.timeout ?? DEFAULT_API_TIMEOUT_MS;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const init: RequestInit = {
          method,
          headers,
          signal: controller.signal,
        };
        if (serialized.payload !== undefined) {
          init.body = serialized.payload;
        }
        const response = await fetch(url, init);
        const body = await parseBody(response);
        const duration = Date.now() - started;
        const normalized: ApiResponse = {
          status: response.status,
          statusText: response.statusText,
          headers: headerRecord(response.headers),
          body,
          duration,
          url,
          ok: response.ok,
        };
        ctx.logger.info('API response', {
          method,
          url,
          status: normalized.status,
          duration,
          body: summarizeBody(body),
        });
        return normalized;
      } catch (error) {
        const duration = Date.now() - started;
        if (controller.signal.aborted) {
          throw new TimeoutError(`API request timed out after ${timeoutMs}ms`, {
            code: 'API_TIMEOUT',
            context: { method, url, timeoutMs, duration },
            cause: error,
          });
        }
        throw new IntegrationError(`API request failed: ${method} ${url}`, {
          code: 'API_REQUEST_FAILED',
          context: { method, url, duration },
          cause: error,
        });
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
