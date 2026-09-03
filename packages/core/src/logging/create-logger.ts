import type { LogFormat, LogLevel, Logger, ResolvedConfig } from '@qakit/contracts';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface CreateLoggerOptions {
  level: LogLevel;
  format: LogFormat;
  context?: Record<string, unknown>;
  write?: (line: string, level: LogLevel) => void;
  now?: () => Date;
}

function defaultWrite(line: string, level: LogLevel): void {
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

function isEnabled(configured: LogLevel, message: LogLevel): boolean {
  return LEVEL_RANK[message] >= LEVEL_RANK[configured];
}

function mergeMeta(
  context: Record<string, unknown>,
  extra: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (extra === undefined) {
    return { ...context };
  }
  return { ...context, ...extra };
}

function formatPretty(
  level: LogLevel,
  message: string,
  timestamp: string,
  meta: Record<string, unknown>,
  error: Error | undefined,
): string {
  const parts = [timestamp, level.toUpperCase(), message];
  for (const [key, value] of Object.entries(meta)) {
    parts.push(`${key}=${stringifyValue(value)}`);
  }
  if (error !== undefined) {
    parts.push(`error=${error.name}:${error.message}`);
    if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
      parts.push(`code=${error.code}`);
    }
  }
  return parts.join(' ');
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatJson(
  level: LogLevel,
  message: string,
  timestamp: string,
  meta: Record<string, unknown>,
  error: Error | undefined,
): string {
  const payload: Record<string, unknown> = {
    level,
    message,
    timestamp,
    ...meta,
  };
  if (error !== undefined) {
    const errorPayload: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };
    if (error.stack !== undefined) {
      errorPayload.stack = error.stack;
    }
    if ('code' in error && typeof error.code === 'string') {
      errorPayload.code = error.code;
    }
    payload.error = errorPayload;
  }
  return JSON.stringify(payload);
}

class ConsoleLogger implements Logger {
  readonly #level: LogLevel;
  readonly #format: LogFormat;
  readonly #context: Record<string, unknown>;
  readonly #write: (line: string, level: LogLevel) => void;
  readonly #now: () => Date;

  constructor(options: CreateLoggerOptions) {
    this.#level = options.level;
    this.#format = options.format;
    this.#context = options.context !== undefined ? { ...options.context } : {};
    this.#write = options.write ?? defaultWrite;
    this.#now = options.now ?? (() => new Date());
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.#emit('debug', message, undefined, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.#emit('info', message, undefined, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.#emit('warn', message, undefined, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.#emit('error', message, error, meta);
  }

  child(context: Record<string, unknown>): Logger {
    return new ConsoleLogger({
      level: this.#level,
      format: this.#format,
      context: { ...this.#context, ...context },
      write: this.#write,
      now: this.#now,
    });
  }

  #emit(level: LogLevel, message: string, error: Error | undefined, meta?: Record<string, unknown>): void {
    if (!isEnabled(this.#level, level)) {
      return;
    }
    const timestamp = this.#now().toISOString();
    const merged = mergeMeta(this.#context, meta);
    const line =
      this.#format === 'json'
        ? formatJson(level, message, timestamp, merged, error)
        : formatPretty(level, message, timestamp, merged, error);
    this.#write(line, level);
  }
}

export function createLogger(options: CreateLoggerOptions): Logger {
  return new ConsoleLogger(options);
}

export function createLoggerFromConfig(
  config: ResolvedConfig,
  options: Omit<CreateLoggerOptions, 'level' | 'format'> = {},
): Logger {
  return createLogger({
    level: config.logging.level,
    format: config.logging.format,
    ...(options.context !== undefined ? { context: options.context } : {}),
    ...(options.write !== undefined ? { write: options.write } : {}),
    ...(options.now !== undefined ? { now: options.now } : {}),
  });
}
