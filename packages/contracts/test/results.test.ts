import { describe, expect, it } from 'vitest';
import { EXECUTION_STATUSES, TEST_STATUSES } from '../src/results.js';
import { ServiceKeys } from '../src/services.js';

describe('result contracts', () => {
  it('keeps test statuses vendor-neutral', () => {
    expect(TEST_STATUSES).toEqual(['passed', 'failed', 'skipped', 'timedOut']);
    expect(EXECUTION_STATUSES).toEqual(['passed', 'failed', 'cancelled']);
  });
});

describe('service keys', () => {
  it('namespaces well-known keys', () => {
    expect(ServiceKeys.Auth).toBe('qakit.auth');
    expect(ServiceKeys.PlaywrightPage).toBe('qakit.playwright.page');
  });
});
