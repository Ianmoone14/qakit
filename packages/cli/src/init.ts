import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CliError } from './cli-error.js';
import { isProjectName } from './project-name.js';
import {
  renderExampleSrc,
  renderExampleTest,
  renderGitignore,
  renderPackageJson,
  renderQakitConfig,
  renderTsconfig,
  renderVitestConfig,
} from './templates.js';
import { readPinnedQakitVersions, type PinnedQakitPackage } from './versions.js';

export interface InitOptions {
  name: string;
  cwd: string;
  force?: boolean;
  /** Absolute path to `packages/` for `file:` specs (tests / local platform work). */
  linkPackagesDir?: string;
}

function toFileSpec(absDir: string): string {
  return `file:${absDir.replace(/\\/g, '/')}`;
}

function resolveSpecs(
  versions: Record<PinnedQakitPackage, string>,
  linkPackagesDir: string | undefined,
): Record<PinnedQakitPackage, string> {
  if (linkPackagesDir === undefined) {
    return {
      '@qakit/core': versions['@qakit/core'],
      '@qakit/playwright': versions['@qakit/playwright'],
      '@qakit/api': versions['@qakit/api'],
    };
  }
  return {
    '@qakit/core': toFileSpec(path.join(linkPackagesDir, 'core')),
    '@qakit/playwright': toFileSpec(path.join(linkPackagesDir, 'playwright')),
    '@qakit/api': toFileSpec(path.join(linkPackagesDir, 'api')),
  };
}

function isEmptyDir(dir: string): boolean {
  if (!existsSync(dir)) {
    return true;
  }
  return readdirSync(dir).length === 0;
}

export function initProject(options: InitOptions): { dir: string; files: string[] } {
  const name = options.name.trim();
  if (name.length === 0) {
    throw new CliError('Missing project name. Usage: qakit init <name>', 'INIT_NAME_MISSING');
  }
  if (!isProjectName(name)) {
    throw new CliError(
      `Invalid project name "${name}". Use lowercase kebab-case (e.g. checkout-api).`,
      'INIT_NAME_INVALID',
    );
  }

  const dir = path.resolve(options.cwd, name);
  if (!isEmptyDir(dir) && options.force !== true) {
    throw new CliError(
      `Refusing to write into non-empty directory: ${dir} (pass --force to overwrite QAKit files)`,
      'INIT_TARGET_EXISTS',
    );
  }

  mkdirSync(dir, { recursive: true });
  mkdirSync(path.join(dir, 'src'), { recursive: true });

  const versions = readPinnedQakitVersions();
  const specs = resolveSpecs(versions, options.linkPackagesDir);
  const files: Array<{ relative: string; contents: string }> = [
    { relative: 'package.json', contents: renderPackageJson({ project: name, specs }) },
    { relative: 'qakit.config.ts', contents: renderQakitConfig(name) },
    { relative: 'tsconfig.json', contents: renderTsconfig() },
    { relative: 'vitest.config.ts', contents: renderVitestConfig() },
    { relative: '.gitignore', contents: renderGitignore() },
    { relative: 'src/example.ts', contents: renderExampleSrc() },
    { relative: 'src/example.test.ts', contents: renderExampleTest(name) },
  ];

  for (const file of files) {
    writeFileSync(path.join(dir, file.relative), file.contents, 'utf8');
  }

  return { dir, files: files.map((file) => file.relative) };
}
