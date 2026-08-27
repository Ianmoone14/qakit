import { describe, expect, it } from 'vitest';
import { CONTRACTS_PACKAGE, CORE_PACKAGE, CORE_VERSION } from '../src/index.js';

describe('@qakit/core (phase 1.1)', () => {
  it('depends on contracts through the public package export', () => {
    expect(CORE_PACKAGE).toBe('@qakit/core');
    expect(CORE_VERSION).toBe('0.1.0');
    expect(CONTRACTS_PACKAGE).toBe('@qakit/contracts');
  });
});
