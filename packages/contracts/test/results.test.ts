import { describe, expect, it } from 'vitest';
import { EXECUTION_STATUSES, TEST_STATUSES } from '../src/results.js';
import { ServiceKeys } from '../src/services.js';
import { CONTRACTS_PACKAGE, CONTRACTS_VERSION } from '../src/version.js';

describe('result contracts', () => {
  it('keeps statuses vendor-neutral', () => {
    expect(TEST_STATUSES).toEqual(['passed', 'failed', 'skipped', 'timedOut']);
    expect(EXECUTION_STATUSES).toEqual(['passed', 'failed', 'cancelled']);
  });
});

describe('service keys', () => {
  it('namespaces well-known keys so core stays generic', () => {
    expect(ServiceKeys.Auth).toBe('qakit.auth');
    expect(ServiceKeys.PlaywrightPage).toBe('qakit.playwright.page');
  });
});

describe('package identity', () => {
  it('exports name and version', () => {
    expect(CONTRACTS_PACKAGE).toBe('@qakit/contracts');
    expect(CONTRACTS_VERSION).toBe('0.1.0');
  });
});
