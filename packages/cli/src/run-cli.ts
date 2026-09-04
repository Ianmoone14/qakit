import { CliError } from './cli-error.js';
import { initProject } from './init.js';
import { HELP_TEXT, parseArgs } from './parse-args.js';
import { formatUpgradeReport, upgradeProject } from './upgrade.js';
import { formatVersionReport, readInstalledQakitVersions } from './versions.js';

export interface RunCliIo {
  cwd?: string;
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
  /** Test seam. Default: the running CLI's platform version. */
  targetVersion?: string;
}

export async function runCli(argv: readonly string[], io: RunCliIo = {}): Promise<number> {
  const stdout = io.stdout ?? ((line: string) => process.stdout.write(line));
  const stderr = io.stderr ?? ((line: string) => process.stderr.write(line));
  const cwd = io.cwd ?? process.cwd();

  try {
    const args = parseArgs(argv, cwd);
    if (args.command === 'help') {
      stdout(HELP_TEXT);
      return 0;
    }
    if (args.command === 'version') {
      stdout(formatVersionReport(readInstalledQakitVersions(args.cwd)));
      return 0;
    }
    if (args.command === 'upgrade') {
      const result = upgradeProject({
        cwd: args.cwd,
        ...(args.major ? { allowMajor: true } : {}),
        ...(args.dryRun ? { dryRun: true } : {}),
        ...(io.targetVersion !== undefined ? { targetVersion: io.targetVersion } : {}),
      });
      stdout(formatUpgradeReport(result));
      if (result.updated.length === 0 && result.blockedMajor.length > 0) {
        return 1;
      }
      return 0;
    }

    const name = args.name;
    if (name === undefined) {
      throw new CliError('Missing project name. Usage: qakit init <name>', 'INIT_NAME_MISSING');
    }
    const initOptions = {
      name,
      cwd: args.cwd,
      ...(args.force ? { force: true } : {}),
      ...(args.linkPackagesDir !== undefined ? { linkPackagesDir: args.linkPackagesDir } : {}),
    };
    const result = initProject(initOptions);
    stdout(`Created ${name} in ${result.dir}\n`);
    stdout(result.files.map((file) => `  ${file}`).join('\n'));
    stdout('\nNext: cd ');
    stdout(name);
    stdout(' && pnpm install\n');
    return 0;
  } catch (error) {
    if (error instanceof CliError) {
      stderr(`${error.message}\n`);
      return 1;
    }
    const message = error instanceof Error ? error.message : String(error);
    stderr(`${message}\n`);
    return 1;
  }
}
