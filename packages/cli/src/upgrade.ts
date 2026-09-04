import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CliError } from './cli-error.js';
import { compareTriples, formatTriple, isMajorUpgrade, parsePinnedVersion } from './semver.js';
import { CLI_PACKAGE, CLI_VERSION } from './package-info.js';
import { readPinnedQakitVersions } from './versions.js';

export const UPGRADEABLE_PACKAGES = [
  '@qakit/core',
  '@qakit/playwright',
  '@qakit/api',
  CLI_PACKAGE,
  '@qakit/contracts',
] as const;

export type UpgradeablePackage = (typeof UPGRADEABLE_PACKAGES)[number];

const UPGRADEABLE = new Set<string>(UPGRADEABLE_PACKAGES);

export interface UpgradeOptions {
  cwd: string;
  allowMajor?: boolean;
  dryRun?: boolean;
  /** Test seam. Default: the running CLI's platform version (packages version together). */
  targetVersion?: string;
}

export interface UpgradeChange {
  name: string;
  from: string;
  to: string;
  section: 'dependencies' | 'devDependencies';
}

export interface UpgradeResult {
  packageJsonPath: string;
  targetVersion: string;
  updated: UpgradeChange[];
  blockedMajor: UpgradeChange[];
  skipped: Array<{ name: string; spec: string; reason: string }>;
  unchanged: Array<{ name: string; spec: string }>;
  wrote: boolean;
}

interface PackageJsonFile {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function findPackageJson(start: string): string | undefined {
  let dir = path.resolve(start);
  while (true) {
    const candidate = path.join(dir, 'package.json');
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

export function readPlatformReleaseVersion(): string {
  return readPinnedQakitVersions()['@qakit/core'] ?? CLI_VERSION;
}

function isUpgradeableName(name: string): boolean {
  return UPGRADEABLE.has(name);
}

export function upgradeProject(options: UpgradeOptions): UpgradeResult {
  const packageJsonPath = findPackageJson(options.cwd);
  if (packageJsonPath === undefined) {
    throw new CliError('No package.json found. Run qakit upgrade from a consumer project.', 'UPGRADE_NO_PACKAGE');
  }

  const targetVersion = options.targetVersion ?? readPlatformReleaseVersion();
  const target = parsePinnedVersion(targetVersion);
  if (target === undefined) {
    throw new CliError(`Invalid platform version: ${targetVersion}`, 'UPGRADE_BAD_TARGET');
  }

  const raw = readFileSync(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw) as PackageJsonFile;
  const updated: UpgradeChange[] = [];
  const blockedMajor: UpgradeChange[] = [];
  const skipped: UpgradeResult['skipped'] = [];
  const unchanged: UpgradeResult['unchanged'] = [];

  const sections: Array<'dependencies' | 'devDependencies'> = ['dependencies', 'devDependencies'];
  for (const section of sections) {
    const deps = pkg[section];
    if (deps === undefined) {
      continue;
    }
    for (const name of Object.keys(deps)) {
      const spec = deps[name];
      if (spec === undefined) {
        continue;
      }
      if (!name.startsWith('@qakit/')) {
        continue;
      }
      if (!isUpgradeableName(name)) {
        skipped.push({ name, spec, reason: 'unknown @qakit package' });
        continue;
      }
      const current = parsePinnedVersion(spec);
      if (current === undefined) {
        skipped.push({ name, spec, reason: 'not an x.y.z pin (workspace/file/range)' });
        continue;
      }
      const cmp = compareTriples(current, target);
      if (cmp === 0) {
        unchanged.push({ name, spec });
        continue;
      }
      if (cmp > 0) {
        skipped.push({ name, spec, reason: `newer than platform ${targetVersion}` });
        continue;
      }
      const change: UpgradeChange = { name, from: spec.replace(/^[~^]/, ''), to: formatTriple(target), section };
      if (isMajorUpgrade(current, target) && options.allowMajor !== true) {
        blockedMajor.push(change);
        continue;
      }
      updated.push(change);
      deps[name] = change.to;
    }
  }

  const shouldWrite = options.dryRun !== true && updated.length > 0;
  if (shouldWrite) {
    writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }

  return {
    packageJsonPath,
    targetVersion,
    updated,
    blockedMajor,
    skipped,
    unchanged,
    wrote: shouldWrite,
  };
}

export function formatUpgradeReport(result: UpgradeResult): string {
  const lines: string[] = [];
  if (result.updated.length === 0 && result.blockedMajor.length === 0 && result.skipped.length === 0) {
    lines.push(`Already up to date (${result.targetVersion}).`);
    return `${lines.join('\n')}\n`;
  }
  if (result.updated.length > 0) {
    lines.push(result.wrote ? 'Updated package.json' : 'Would update package.json');
    for (const change of result.updated) {
      lines.push(`  ${change.name}  ${change.from} -> ${change.to}`);
    }
  }
  if (result.blockedMajor.length > 0) {
    lines.push('Skipped major bumps (pass --major):');
    for (const change of result.blockedMajor) {
      lines.push(`  ${change.name}  ${change.from} -> ${change.to}`);
    }
  }
  if (result.skipped.length > 0) {
    lines.push('Left unchanged:');
    for (const item of result.skipped) {
      lines.push(`  ${item.name}  ${item.spec}  (${item.reason})`);
    }
  }
  if (result.wrote) {
    lines.push('Next: pnpm install');
  }
  return `${lines.join('\n')}\n`;
}
