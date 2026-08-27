import { describe, expect, it } from 'vitest';
import { redactString, redactValue } from '../src/logging/redact.js';
import { createLogger } from '../src/logging/create-logger.js';

describe('redaction', () => {
  it('redacts bearer tokens and JWTs in strings', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.signature';
    expect(redactString(`Authorization: Bearer abc.def`)).toContain('[REDACTED]');
    expect(redactString(jwt)).toBe('[REDACTED]');
  });

  it('redacts sensitive object keys', () => {
    const redacted = redactValue({
      password: 'hunter2',
      nested: { apiKey: 'secret-key', count: 1 },
    }) as { password: string; nested: { apiKey: string; count: number } };
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.nested.apiKey).toBe('[REDACTED]');
    expect(redacted.nested.count).toBe(1);
  });
});

describe('createLogger', () => {
  it('writes json lines with bindings and supports child loggers', () => {
    const lines: string[] = [];
    const logger = createLogger({
      level: 'debug',
      format: 'json',
      bindings: { executionId: '01TEST', project: 'log-project', environment: 'test' },
      destination: {
        write(msg: string) {
          lines.push(msg);
        },
      },
    });
    logger.info('hello', { token: 'should-hide' });
    logger.child({ testId: 't1' }).warn('child');
    const parsed = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(parsed[0]?.msg).toBe('hello');
    expect(parsed[0]?.project).toBe('log-project');
    expect(parsed[0]?.token).toBe('[REDACTED]');
    expect(parsed[1]?.testId).toBe('t1');
  });
});
