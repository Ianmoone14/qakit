import type { LogFormat, LogLevel, Logger } from '@qakit/contracts';
import pino from 'pino';
import pretty from 'pino-pretty';
import { redactMeta, redactString } from './redact.js';

export interface CreateLoggerOptions {
  level: LogLevel;
  format: LogFormat;
  bindings?: Record<string, unknown>;
  destination?: pino.DestinationStream;
}

function wrap(instance: pino.Logger): Logger {
  return {
    debug(message: string, meta?: Record<string, unknown>): void {
      const redacted = redactMeta(meta);
      if (redacted === undefined) {
        instance.debug(redactString(message));
        return;
      }
      instance.debug(redacted, redactString(message));
    },
    info(message: string, meta?: Record<string, unknown>): void {
      const redacted = redactMeta(meta);
      if (redacted === undefined) {
        instance.info(redactString(message));
        return;
      }
      instance.info(redacted, redactString(message));
    },
    warn(message: string, meta?: Record<string, unknown>): void {
      const redacted = redactMeta(meta);
      if (redacted === undefined) {
        instance.warn(redactString(message));
        return;
      }
      instance.warn(redacted, redactString(message));
    },
    error(message: string, error?: Error, meta?: Record<string, unknown>): void {
      const payload: Record<string, unknown> = { ...(redactMeta(meta) ?? {}) };
      if (error !== undefined) {
        payload.err = {
          message: redactString(error.message),
          ...(error.stack !== undefined ? { stack: error.stack } : {}),
          ...(error.name !== undefined ? { name: error.name } : {}),
        };
      }
      instance.error(payload, redactString(message));
    },
    child(context: Record<string, unknown>): Logger {
      return wrap(instance.child(redactMeta(context) ?? {}));
    },
  };
}

export function createLogger(options: CreateLoggerOptions): Logger {
  const stream =
    options.destination ??
    (options.format === 'pretty'
      ? pretty({ colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' })
      : undefined);

  const instance = stream
    ? pino(
        {
          level: options.level,
          base: options.bindings ?? {},
          redact: {
            paths: [
              'password',
              'token',
              'secret',
              'authorization',
              'apiKey',
              'api_key',
              'access_token',
              'refresh_token',
              'cookie',
              '*.password',
              '*.token',
              'headers.authorization',
              'headers.Authorization',
            ],
            censor: '[REDACTED]',
          },
        },
        stream,
      )
    : pino({
        level: options.level,
        base: options.bindings ?? {},
        redact: {
          paths: [
            'password',
            'token',
            'secret',
            'authorization',
            'apiKey',
            'api_key',
            'access_token',
            'refresh_token',
            'cookie',
            '*.password',
            '*.token',
            'headers.authorization',
            'headers.Authorization',
          ],
          censor: '[REDACTED]',
        },
      });

  return wrap(instance);
}
