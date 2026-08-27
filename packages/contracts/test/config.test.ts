import { describe, expect, it } from 'vitest';
import { PROJECT_NAME_PATTERN, qakitConfigSchema } from '../src/config.js';

describe('qakitConfigSchema', () => {
  it('accepts a minimal valid config', () => {
    const parsed = qakitConfigSchema.parse({ project: 'checkout-api' });
    expect(parsed.project).toBe('checkout-api');
  });

  it('rejects uppercase project names', () => {
    const result = qakitConfigSchema.safeParse({ project: 'Checkout' });
    expect(result.success).toBe(false);
  });

  it('rejects project names that start with a digit or hyphen', () => {
    expect(PROJECT_NAME_PATTERN.test('1team')).toBe(false);
    expect(PROJECT_NAME_PATTERN.test('-team')).toBe(false);
    expect(PROJECT_NAME_PATTERN.test('team')).toBe(true);
  });

  it('rejects invalid baseUrl values', () => {
    const result = qakitConfigSchema.safeParse({
      project: 'demo',
      baseUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('accepts extensions with name and version', () => {
    const parsed = qakitConfigSchema.parse({
      project: 'demo',
      extensions: [{ name: 'playwright', version: '1.0.0' }],
    });
    expect(parsed.extensions).toHaveLength(1);
  });
});
