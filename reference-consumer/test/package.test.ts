import { describe, expect, it } from 'vitest';
import { CORE_PACKAGE } from '@qakit/core';

describe('reference-consumer (phase 1.1)', () => {
  it('imports the public @qakit/core package', () => {
    expect(CORE_PACKAGE).toBe('@qakit/core');
  });
});
