import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CLI_VERSION, HELP_TEXT, parseArgs, runCli, upgradeProject } from '../src/index.js';

describe('qakit upgrade', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  async function fixture(deps: Record<string, string>): Promise<string> {
    const cwd = await mkdtemp(path.join(tmpdir(), 'qakit-upgrade-'));
    dirs.push(cwd);
    await writeFile(
      path.join(cwd, 'package.json'),
      `${JSON.stringify(
        {
          name: 'checkout-api',
          private: true,
          dependencies: deps,
        },
        null,
        2,
      )}\n`,
    );
    await mkdir(path.join(cwd, 'src'), { recursive: true });
    await writeFile(path.join(cwd, 'src', 'login.test.ts'), 'export const teamTest = true;\n');
    return cwd;
  }

  it('parses --major and --dry-run', () => {
    const parsed = parseArgs(['upgrade', '--major', '--dry-run'], '/tmp');
    expect(parsed.command).toBe('upgrade');
    expect(parsed.major).toBe(true);
    expect(parsed.dryRun).toBe(true);
    expect(HELP_TEXT).toContain('qakit upgrade');
  });

  it('bumps pinned @qakit versions in a fixture consumer and leaves tests alone', async () => {
    const cwd = await fixture({
      '@qakit/core': '^0.0.9',
      '@qakit/playwright': '0.0.9',
      '@qakit/mystery': '1.2.3',
      lodash: '4.17.21',
    });
    let out = '';
    const code = await runCli(['upgrade'], {
      cwd: path.join(cwd, 'src'),
      stdout: (line) => {
        out += line;
      },
    });
    expect(code).toBe(0);
    expect(out).toContain(`@qakit/core  0.0.9 -> ${CLI_VERSION}`);
    expect(out).toContain('Next: pnpm install');
    expect(out).toContain('unknown @qakit package');
    const pkg = JSON.parse(await readFile(path.join(cwd, 'package.json'), 'utf8')) as {
      name: string;
      private: boolean;
      dependencies: Record<string, string>;
    };
    expect(pkg.name).toBe('checkout-api');
    expect(pkg.private).toBe(true);
    expect(pkg.dependencies['@qakit/core']).toBe(CLI_VERSION);
    expect(pkg.dependencies['@qakit/playwright']).toBe(CLI_VERSION);
    expect(pkg.dependencies['@qakit/mystery']).toBe('1.2.3');
    expect(pkg.dependencies.lodash).toBe('4.17.21');
    expect(await readFile(path.join(cwd, 'src', 'login.test.ts'), 'utf8')).toBe('export const teamTest = true;\n');
  });

  it('does not rewrite files on --dry-run', async () => {
    const cwd = await fixture({ '@qakit/core': '0.0.9' });
    let out = '';
    const code = await runCli(['upgrade', '--dry-run'], {
      cwd,
      stdout: (line) => {
        out += line;
      },
    });
    expect(code).toBe(0);
    expect(out).toContain('Would update package.json');
    expect(out).not.toContain('Next: pnpm install');
    const pkg = JSON.parse(await readFile(path.join(cwd, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['@qakit/core']).toBe('0.0.9');
  });

  it('reports already up to date', async () => {
    const cwd = await fixture({ '@qakit/core': CLI_VERSION });
    let out = '';
    const code = await runCli(['upgrade'], {
      cwd,
      stdout: (line) => {
        out += line;
      },
    });
    expect(code).toBe(0);
    expect(out).toContain('Already up to date');
  });

  it('blocks a major bump without --major', async () => {
    const cwd = await fixture({ '@qakit/core': '0.1.0' });
    let out = '';
    const code = await runCli(['upgrade'], {
      cwd,
      targetVersion: '1.0.0',
      stdout: (line) => {
        out += line;
      },
    });
    expect(code).toBe(1);
    expect(out).toContain('Skipped major bumps');
    const pkg = JSON.parse(await readFile(path.join(cwd, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['@qakit/core']).toBe('0.1.0');
  });

  it('applies a major bump with --major', async () => {
    const cwd = await fixture({ '@qakit/core': '0.1.0' });
    const code = await runCli(['upgrade', '--major'], {
      cwd,
      targetVersion: '1.0.0',
      stdout: () => undefined,
    });
    expect(code).toBe(0);
    const pkg = JSON.parse(await readFile(path.join(cwd, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['@qakit/core']).toBe('1.0.0');
  });

  it('skips workspace and file specifiers', async () => {
    const cwd = await fixture({
      '@qakit/core': 'workspace:*',
      '@qakit/api': 'file:../packages/api',
    });
    const result = upgradeProject({ cwd });
    expect(result.updated).toHaveLength(0);
    expect(result.skipped).toHaveLength(2);
  });

  it('does not downgrade a newer pin', async () => {
    const cwd = await fixture({ '@qakit/core': '9.9.9' });
    const result = upgradeProject({ cwd, targetVersion: '0.1.0' });
    expect(result.updated).toHaveLength(0);
    expect(result.skipped[0]?.reason).toContain('newer than platform');
  });
});
