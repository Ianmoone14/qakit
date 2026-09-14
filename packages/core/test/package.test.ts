import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { CONTRACTS_PACKAGE, CORE_PACKAGE, CORE_VERSION, defineConfig } from '../src/index.js';

const pkg = createRequire(import.meta.url)('../package.json') as { version: string };

describe('@qakit/core public package', () => {
  it('depends on contracts through the public package export', () => {
    expect(CORE_PACKAGE).toBe('@qakit/core');
    expect(CORE_VERSION).toBe(pkg.version);
    expect(CONTRACTS_PACKAGE).toBe('@qakit/contracts');
  });

  it('exports defineConfig from the package index', () => {
    const config = defineConfig({ project: 'checkout-api' });
    expect(config.project).toBe('checkout-api');
  });
});
