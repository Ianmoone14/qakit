import { describe, expect, it } from 'vitest';
import { CORE_PACKAGE, defineConfig } from '@qakit/core';

describe('reference-consumer', () => {
  it('imports the public @qakit/core package', () => {
    expect(CORE_PACKAGE).toBe('@qakit/core');
  });

  it('can call defineConfig from the public package', () => {
    const config = defineConfig({ project: 'example-project' });
    expect(config.project).toBe('example-project');
  });
});
