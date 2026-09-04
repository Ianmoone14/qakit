import { CliError } from './cli-error.js';

export type CliCommand = 'init' | 'version' | 'help' | 'upgrade';

export interface ParsedArgs {
  command: CliCommand;
  cwd: string;
  force: boolean;
  major: boolean;
  dryRun: boolean;
  name?: string;
  linkPackagesDir?: string;
}

export function parseArgs(argv: readonly string[], cwd = process.cwd()): ParsedArgs {
  const args = [...argv];
  let force = false;
  let major = false;
  let dryRun = false;
  let cwdOpt: string | undefined;
  let linkPackagesDir: string | undefined;
  const positional: string[] = [];

  while (args.length > 0) {
    const next = args.shift();
    if (next === undefined) {
      break;
    }
    if (next === '--help' || next === '-h') {
      return { command: 'help', cwd: cwdOpt ?? cwd, force, major, dryRun };
    }
    if (next === '--version' || next === '-v') {
      return { command: 'version', cwd: cwdOpt ?? cwd, force, major, dryRun };
    }
    if (next === '--force') {
      force = true;
      continue;
    }
    if (next === '--major') {
      major = true;
      continue;
    }
    if (next === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (next === '--cwd') {
      const value = args.shift();
      if (value === undefined) {
        throw new CliError('Missing value for --cwd', 'INIT_ARGS_INVALID');
      }
      cwdOpt = value;
      continue;
    }
    if (next === '--link-packages') {
      const value = args.shift();
      if (value === undefined) {
        throw new CliError('Missing value for --link-packages', 'INIT_ARGS_INVALID');
      }
      linkPackagesDir = value;
      continue;
    }
    if (next.startsWith('-')) {
      throw new CliError(`Unknown option: ${next}`, 'INIT_ARGS_INVALID');
    }
    positional.push(next);
  }

  const commandToken = positional[0];
  const resolvedCwd = cwdOpt ?? cwd;
  const base: ParsedArgs = { command: 'help', cwd: resolvedCwd, force, major, dryRun };

  if (commandToken === undefined || commandToken === 'help') {
    return base;
  }
  if (commandToken === 'version') {
    return { ...base, command: 'version' };
  }
  if (commandToken === 'upgrade') {
    return { ...base, command: 'upgrade' };
  }
  if (commandToken === 'init') {
    const parsed: ParsedArgs = { ...base, command: 'init' };
    const name = positional[1];
    if (name !== undefined) {
      parsed.name = name;
    }
    if (linkPackagesDir !== undefined) {
      parsed.linkPackagesDir = linkPackagesDir;
    }
    return parsed;
  }

  throw new CliError(`Unknown command: ${commandToken}`, 'UNKNOWN_COMMAND');
}

export const HELP_TEXT = `Usage:
  qakit init <name> [--force] [--cwd <dir>]
  qakit version
  qakit upgrade [--major] [--dry-run] [--cwd <dir>]
  qakit --help

init scaffolds a consumer project (package.json, qakit.config.ts, sample test).
version prints installed @qakit package versions.
upgrade bumps pinned @qakit/* versions in package.json (not tests). Use --major for a major bump.
`;
