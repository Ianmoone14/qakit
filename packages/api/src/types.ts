export const API_EXTENSION_VERSION = '1.0.0';

export interface ApiConfig {
  timeout?: number;
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
  url: string;
  ok: boolean;
}

export const DEFAULT_API_TIMEOUT_MS = 30_000;
