import type { PinnedQakitPackage } from './versions.js';

export interface TemplateInput {
  project: string;
  specs: Record<PinnedQakitPackage, string>;
}

export function renderGitignore(): string {
  return `node_modules
dist
coverage
.turbo
*.log
artifacts
.DS_Store
.env
.env.*
`;
}

export function renderPackageJson(input: TemplateInput): string {
  const pkg = {
    name: input.project,
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      test: 'vitest run',
      typecheck: 'tsc -p tsconfig.json --noEmit',
    },
    dependencies: {
      '@qakit/api': input.specs['@qakit/api'],
      '@qakit/core': input.specs['@qakit/core'],
      '@qakit/playwright': input.specs['@qakit/playwright'],
    },
    devDependencies: {
      '@types/node': '^26.4.0',
      typescript: '^5.4.0',
      vitest: '^1.6.0',
    },
    engines: {
      node: '>=20',
    },
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

export function renderTsconfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        noUncheckedIndexedAccess: true,
        exactOptionalPropertyTypes: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        noEmit: true,
        rootDir: '.',
        types: ['node'],
      },
      include: ['src/**/*.ts', 'qakit.config.ts'],
    },
    null,
    2,
  )}\n`;
}

export function renderVitestConfig(): string {
  return `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
`;
}

export function renderQakitConfig(project: string): string {
  return `import { defineConfig } from '@qakit/core';

export default defineConfig({
  project: '${project}',
  environment: 'development',
});
`;
}

export function renderExampleSrc(): string {
  return `import { loadConfig } from '@qakit/core';

export async function loadProjectConfig(cwd = process.cwd()): Promise<string> {
  const config = await loadConfig({ cwd, env: {} });
  return config.project;
}
`;
}

export function renderExampleTest(project: string): string {
  return `import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadProjectConfig } from './example.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('sample', () => {
  it('loads qakit config', async () => {
    await expect(loadProjectConfig(root)).resolves.toBe('${project}');
  });
});
`;
}
