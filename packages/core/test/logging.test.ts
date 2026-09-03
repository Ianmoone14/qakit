import { ConfigurationError, ExecutionError, QakitError, TimeoutError } from '@qakit/contracts';
import { describe, expect, it } from 'vitest';
import { createLogger, createLoggerFromConfig, resolveConfig, wrapError } from '../src/index.js';

describe('createLogger', () => {
  it('filters below the configured level', () => {
    const lines: string[] = [];
    const logger = createLogger({
      level: 'warn',
      format: 'pretty',
      write: (line) => {
        lines.push(line);
      },
    });

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('WARN');
    expect(lines[1]).toContain('ERROR');
  });

  it('emits JSON with level, message, and timestamp', () => {
    const lines: string[] = [];
    const logger = createLogger({
      level: 'info',
      format: 'json',
      now: () => new Date('2026-09-03T12:00:00.000Z'),
      write: (line) => {
        lines.push(line);
      },
    });

    logger.info('started', { project: 'checkout-api' });
    expect(lines).toHaveLength(1);
    const payload = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
    expect(payload).toMatchObject({
      level: 'info',
      message: 'started',
      timestamp: '2026-09-03T12:00:00.000Z',
      project: 'checkout-api',
    });
  });

  it('child adds metadata without mutating the parent', () => {
    const lines: Array<{ line: string }> = [];
    const parentContext = { executionId: 'exec-1' };
    const logger = createLogger({
      level: 'info',
      format: 'json',
      context: parentContext,
      write: (line) => {
        lines.push({ line });
      },
    });

    const child = logger.child({ testId: 't1' });
    child.info('test');
    logger.info('run');

    expect(parentContext).toEqual({ executionId: 'exec-1' });

    const childPayload = JSON.parse(lines[0]?.line ?? '{}') as Record<string, unknown>;
    const parentPayload = JSON.parse(lines[1]?.line ?? '{}') as Record<string, unknown>;
    expect(childPayload.executionId).toBe('exec-1');
    expect(childPayload.testId).toBe('t1');
    expect(parentPayload.executionId).toBe('exec-1');
    expect(parentPayload.testId).toBeUndefined();
  });

  it('reads level and format from resolved config', () => {
    const lines: string[] = [];
    const config = resolveConfig({
      file: { project: 'checkout-api', logging: { level: 'error', format: 'json' } },
      env: {},
    });
    const logger = createLoggerFromConfig(config, {
      write: (line) => {
        lines.push(line);
      },
    });

    logger.warn('skip');
    logger.error('keep');
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({ level: 'error', message: 'keep' });
  });
});

describe('wrapError', () => {
  it('passes QakitError subclasses through', () => {
    const original = new ConfigurationError('bad project', { code: 'INVALID_PROJECT' });
    expect(wrapError(original)).toBe(original);
    expect(wrapError(new TimeoutError('slow'))).toBeInstanceOf(TimeoutError);
  });

  it('wraps native Error as ExecutionError and keeps cause', () => {
    const native = new Error('boom');
    const wrapped = wrapError(native);
    expect(wrapped).toBeInstanceOf(ExecutionError);
    expect(wrapped).toBeInstanceOf(QakitError);
    expect(wrapped.code).toBe('UNEXPECTED_ERROR');
    expect(wrapped.message).toBe('boom');
    expect(wrapped.cause).toBe(native);
  });

  it('wraps non-error throws', () => {
    const wrapped = wrapError('nope');
    expect(wrapped).toBeInstanceOf(ExecutionError);
    expect(wrapped.code).toBe('UNEXPECTED_ERROR');
    expect(wrapped.context).toEqual({ thrown: 'nope' });
  });
});
