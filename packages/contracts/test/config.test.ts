import { describe, expect, it } from 'vitest';
import { PROJECT_NAME_PATTERN, qakitConfigSchema } from '../src/config.js';

describe('qakitConfigSchema', () => {
  it('accepts a minimal kebab-case project', () => {
    const parsed = qakitConfigSchema.parse({ project: 'checkout-api' });
    expect(parsed.project).toBe('checkout-api');
  });

  it('rejects uppercase project names', () => {
    expect(qakitConfigSchema.safeParse({ project: 'Checkout' }).success).toBe(false);
  });

  it('requires project to start with a letter', () => {
    expect(PROJECT_NAME_PATTERN.test('1team')).toBe(false);
    expect(PROJECT_NAME_PATTERN.test('team')).toBe(true);
  });

  it('rejects an invalid baseUrl', () => {
    expect(
      qakitConfigSchema.safeParse({ project: 'demo', baseUrl: 'not-a-url' }).success,
    ).toBe(false);
  });

  it('accepts extensions with name and version', () => {
    const parsed = qakitConfigSchema.parse({
      project: 'demo',
      extensions: [{ name: 'playwright', version: '1.0.0' }],
    });
    expect(parsed.extensions).toHaveLength(1);
  });
});
