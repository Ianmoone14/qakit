import { createRequire } from 'node:module';
import path from 'node:path';
import { CLI_PACKAGE, CLI_VERSION } from './package-info.js';

const PINNED_PACKAGES = ['@qakit/core', '@qakit/playwright', '@qakit/api'] as const;
const REPORT_PACKAGES = [CLI_PACKAGE, ...PINNED_PACKAGES, '@qakit/contracts'] as const;

export type PinnedQakitPackage = (typeof PINNED_PACKAGES)[number];

export function readCliVersion(): string {
  return CLI_VERSION;
}

export function readPinnedQakitVersions(): Record<PinnedQakitPackage, string> {
  const req = createRequire(import.meta.url);
  const versions = {} as Record<PinnedQakitPackage, string>;
  for (const name of PINNED_PACKAGES) {
    const pkg = req(`${name}/package.json`) as { version: string };
    versions[name] = pkg.version;
  }
  return versions;
}

export function readInstalledQakitVersions(fromDir: string): Record<string, string> {
  const req = createRequire(path.join(fromDir, 'package.json'));
  const versions: Record<string, string> = { [CLI_PACKAGE]: readCliVersion() };
  for (const name of REPORT_PACKAGES) {
    if (name === CLI_PACKAGE) {
      continue;
    }
    try {
      const pkg = req(`${name}/package.json`) as { version?: string };
      if (typeof pkg.version === 'string') {
        versions[name] = pkg.version;
      }
    } catch {
      // not installed in this project
    }
  }
  return versions;
}

export function formatVersionReport(versions: Record<string, string>): string {
  const lines = REPORT_PACKAGES.flatMap((name) => {
    const version = versions[name];
    return version === undefined ? [] : [`${name} ${version}`];
  });
  return `${lines.join('\n')}\n`;
}
