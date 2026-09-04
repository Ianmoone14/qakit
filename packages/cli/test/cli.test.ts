import { execFileSync } from 'node:child_process';
import { mkdirSync, symlinkSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '@qakit/core';
import {
  CLI_BIN,
  CLI_PACKAGE,
  CLI_VERSION,
  initProject,
  parseArgs,
  runCli,
} from '../src/index.js';

const cliRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.join(cliRoot, '..', '..');
const packagesDir = path.join(repoRoot, 'packages');

function linkDir(target: string, dest: string): void {
  mkdirSync(path.dirname(dest), { recursive: true });
  symlinkSync(target, dest, process.platform === 'win32' ? 'junction' : 'dir');
}

function linkGeneratedNodeModules(projectDir: string): void {
  const nm = path.join(projectDir, 'node_modules');
  linkDir(path.join(packagesDir, 'core'), path.join(nm, '@qakit', 'core'));
  linkDir(path.join(packagesDir, 'contracts'), path.join(nm, '@qakit', 'contracts'));
  linkDir(path.join(packagesDir, 'playwright'), path.join(nm, '@qakit', 'playwright'));
  linkDir(path.join(packagesDir, 'api'), path.join(nm, '@qakit', 'api'));
  linkDir(path.join(cliRoot, 'node_modules', 'typescript'), path.join(nm, 'typescript'));
  linkDir(path.join(cliRoot, 'node_modules', 'vitest'), path.join(nm, 'vitest'));
  linkDir(path.join(cliRoot, 'node_modules', '@types', 'node'), path.join(nm, '@types', 'node'));
}

describe('parseArgs', () => {
  it('parses init with --force', () => {
    const parsed = parseArgs(['init', 'checkout-api', '--force'], '/tmp');
    expect(parsed.command).toBe('init');
    expect(parsed.name).toBe('checkout-api');
    expect(parsed.force).toBe(true);
  });

  it('treats --version as version', () => {
    expect(parseArgs(['--version'], '/tmp').command).toBe('version');
  });
});

describe('qakit init', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it('writes a consumer project with pinned @qakit versions', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'qakit-cli-'));
    dirs.push(cwd);
    const result = initProject({ name: 'checkout-api', cwd });
    const pkg = JSON.parse(await readFile(path.join(result.dir, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['@qakit/core']).toBe('0.1.0');
    expect(pkg.dependencies['@qakit/playwright']).toBe('0.1.0');
    expect(pkg.dependencies['@qakit/api']).toBe('0.1.0');
    expect(await readFile(path.join(result.dir, 'qakit.config.ts'), 'utf8')).toContain("project: 'checkout-api'");
    expect(result.files).toContain('src/example.test.ts');
  });

  it('refuses a non-empty directory without --force', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'qakit-cli-'));
    dirs.push(cwd);
    initProject({ name: 'checkout-api', cwd });
    expect(() => initProject({ name: 'checkout-api', cwd })).toThrow(/--force/);
    const code = await runCli(['init', 'checkout-api'], { cwd, stdout: () => undefined, stderr: () => undefined });
    expect(code).toBe(1);
  });

  it('overwrites with --force', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'qakit-cli-'));
    dirs.push(cwd);
    initProject({ name: 'checkout-api', cwd });
    const extra = path.join(cwd, 'checkout-api', 'keep.txt');
    await writeFile(extra, 'stay');
    const code = await runCli(['init', 'checkout-api', '--force'], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined,
    });
    expect(code).toBe(0);
    expect(await readFile(extra, 'utf8')).toBe('stay');
  });

  it('rejects an invalid project name', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'qakit-cli-'));
    dirs.push(cwd);
    const stderr: string[] = [];
    const code = await runCli(['init', 'CheckoutAPI'], { cwd, stdout: () => undefined, stderr: (line) => stderr.push(line) });
    expect(code).toBe(1);
    expect(stderr.join('')).toContain('kebab-case');
  });
});

describe('qakit version', () => {
  it('prints the CLI version', async () => {
    let out = '';
    const code = await runCli(['version'], {
      cwd: repoRoot,
      stdout: (line) => {
        out += line;
      },
    });
    expect(code).toBe(0);
    expect(out).toContain(`${CLI_PACKAGE} ${CLI_VERSION}`);
    expect(CLI_BIN).toBe('qakit');
  });
});

describe('generated project', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it(
    'installs, typechecks, and loads config',
    async () => {
      const cwd = await mkdtemp(path.join(tmpdir(), 'qakit-cli-'));
      dirs.push(cwd);
      const result = initProject({ name: 'checkout-api', cwd, linkPackagesDir: packagesDir });
      linkGeneratedNodeModules(result.dir);
      const tscJs = path.join(cliRoot, 'node_modules', 'typescript', 'bin', 'tsc');
      execFileSync(process.execPath, [tscJs, '-p', 'tsconfig.json', '--noEmit'], {
        cwd: result.dir,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      const config = await loadConfig({ cwd: result.dir, env: {} });
      expect(config.project).toBe('checkout-api');

      let out = '';
      const code = await runCli(['version'], {
        cwd: result.dir,
        stdout: (line) => {
          out += line;
        },
      });
      expect(code).toBe(0);
      expect(out).toContain('@qakit/core 0.1.0');
    },
    120_000,
  );
});
