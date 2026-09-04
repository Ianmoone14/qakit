import { CliError } from './cli-error.js';

export type CliCommand = 'init' | 'version' | 'help';

export interface ParsedArgs {
  command: CliCommand;
  cwd: string;
  force: boolean;
  name?: string;
  linkPackagesDir?: string;
}

export function parseArgs(argv: readonly string[], cwd = process.cwd()): ParsedArgs {
  const args = [...argv];
  let force = false;
  let cwdOpt: string | undefined;
  let linkPackagesDir: string | undefined;
  const positional: string[] = [];

  while (args.length > 0) {
    const next = args.shift();
    if (next === undefined) {
      break;
    }
    if (next === '--help' || next === '-h') {
      const parsed: ParsedArgs = { command: 'help', cwd: cwdOpt ?? cwd, force };
      return parsed;
    }
    if (next === '--version' || next === '-v') {
      return { command: 'version', cwd: cwdOpt ?? cwd, force };
    }
    if (next === '--force') {
      force = true;
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

  if (commandToken === undefined || commandToken === 'help') {
    return { command: 'help', cwd: resolvedCwd, force };
  }
  if (commandToken === 'version') {
    return { command: 'version', cwd: resolvedCwd, force };
  }
  if (commandToken === 'init') {
    const parsed: ParsedArgs = { command: 'init', cwd: resolvedCwd, force };
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
  qakit --help

init scaffolds a consumer project (package.json, qakit.config.ts, sample test).
version prints installed @qakit package versions.
`;
