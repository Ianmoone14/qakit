const SENSITIVE_KEY = /password|token|secret|authorization|api[_-]?key|cookie|passwd|pwd/i;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._\-+=/]+/gi;
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+/g;

export function redactString(value: string): string {
  return value.replace(BEARER_PATTERN, 'Bearer [REDACTED]').replace(JWT_PATTERN, '[REDACTED]');
}

export function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value !== null && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactValue(nested);
    }
    return output;
  }
  return value;
}

export function redactMeta(
  meta: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (meta === undefined) {
    return undefined;
  }
  return redactValue(meta) as Record<string, unknown>;
}
