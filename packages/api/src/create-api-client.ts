import { writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  FrameworkError,
  IntegrationError,
  TimeoutError,
  type AuthProvider,
  type ExecutionContext,
  type TestContext,
} from '@qakit/core';

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface HttpRequest {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export interface ApiClient {
  request(input: HttpRequest): Promise<HttpResponse>;
}

export interface ApiClientOptions {
  auth?: AuthProvider;
  saveArtifacts?: boolean;
  defaultTimeout?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

function isTestContext(ctx: ExecutionContext | TestContext): ctx is TestContext {
  return 'testId' in ctx;
}

function resolveRequestUrl(url: string, baseUrl: string | undefined): string {
  if (URL.canParse(url)) {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  }
  if (baseUrl === undefined) {
    throw new FrameworkError(`Relative URL requires config.baseUrl: ${url}`, {
      code: 'HTTP_BASE_URL_MISSING',
      context: { url },
    });
  }
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(url, base).href;
}

function isAbortTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

function headerRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

async function persist(
  ctx: ExecutionContext | TestContext,
  type: 'request' | 'response',
  name: string,
  contents: string,
): Promise<void> {
  const tmp = path.join(tmpdir(), `qakit-api-${type}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  await writeFile(tmp, contents, 'utf8');
  try {
    const input = {
      type,
      name,
      path: tmp,
      executionId: ctx.executionId,
      ...(isTestContext(ctx) ? { testId: ctx.testId } : {}),
    };
    await ctx.artifacts.save(input);
  } finally {
    await rm(tmp, { force: true });
  }
}

export function isAuthProvider(value: unknown): value is AuthProvider {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { name?: unknown; getHeaders?: unknown };
  return typeof candidate.name === 'string' && typeof candidate.getHeaders === 'function';
}

export function createApiClient(
  ctx: ExecutionContext | TestContext,
  options: ApiClientOptions = {},
): ApiClient {
  const saveArtifacts = options.saveArtifacts === true;
  const defaultTimeout = options.defaultTimeout ?? DEFAULT_TIMEOUT_MS;
  const auth = options.auth;

  return {
    async request(input) {
      const url = resolveRequestUrl(input.url, ctx.config.baseUrl);
      const timeout = input.timeout ?? defaultTimeout;
      const authHeaders = auth !== undefined ? await auth.getHeaders(ctx) : {};
      const headers = { ...authHeaders, ...input.headers };
      const method = input.method;

      if (saveArtifacts) {
        await persist(
          ctx,
          'request',
          'request.json',
          JSON.stringify({ method, url, headers, body: input.body ?? null }),
        );
      }

      const init: RequestInit = {
        method,
        signal: AbortSignal.timeout(timeout),
      };
      if (Object.keys(headers).length > 0) {
        init.headers = headers;
      }
      if (input.body !== undefined) {
        init.body = input.body;
      }

      let response: HttpResponse;
      try {
        const res = await fetch(url, init);
        response = {
          status: res.status,
          statusText: res.statusText,
          headers: headerRecord(res.headers),
          body: await res.text(),
        };
      } catch (error) {
        if (isAbortTimeout(error)) {
          throw new TimeoutError(`HTTP request timed out after ${String(timeout)}ms`, {
            code: 'HTTP_TIMEOUT',
            context: { url, method, timeout },
            cause: error,
          });
        }
        const message = error instanceof Error ? error.message : 'HTTP request failed';
        throw new IntegrationError(message, {
          code: 'HTTP_NETWORK_ERROR',
          context: { url, method },
          cause: error,
        });
      }

      if (saveArtifacts) {
        await persist(
          ctx,
          'response',
          'response.json',
          JSON.stringify({ status: response.status, headers: response.headers, body: response.body }),
        );
      }

      if (response.status >= 400) {
        const code = response.status >= 500 ? 'HTTP_SERVER_ERROR' : 'HTTP_CLIENT_ERROR';
        throw new IntegrationError(`HTTP ${String(response.status)} ${response.statusText}`.trim(), {
          code,
          context: { url, method, status: response.status, body: response.body },
        });
      }

      return response;
    },
  };
}
