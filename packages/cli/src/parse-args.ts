import { CliError } from './cli-error.js';

export type CliCommand = 'init' | 'version' | 'help' | 'upgrade';

export interface ParsedArgs {
  command: CliCommand;
  cwd: string;
  force: boolean;
  major: boolean;
  dryRun: boolean;
  playwright: boolean;
  api: boolean;
  name?: string;
  linkPackagesDir?: string;
}

function requireOptionValue(args: string[], flag: string): string {
  const value = args.shift();
  if (value === undefined) {
    throw new CliError(`Missing value for ${flag}`, 'INIT_ARGS_INVALID');
  }
  return value;
}

export function parseArgs(argv: readonly string[], cwd = process.cwd()): ParsedArgs {
  const args = [...argv];
  let force = false;
  let major = false;
  let dryRun = false;
  let playwrightFlag = false;
  let apiFlag = false;
  let cwdOpt: string | undefined;
  let linkPackagesDir: string | undefined;
  const positional: string[] = [];

  while (args.length > 0) {
    const next = args.shift();
    if (next === undefined) {
      break;
    }
    switch (next) {
      case '--help':
      case '-h':
        return { command: 'help', cwd: cwdOpt ?? cwd, force, major, dryRun, playwright: true, api: true };
      case '--version':
      case '-v':
        return { command: 'version', cwd: cwdOpt ?? cwd, force, major, dryRun, playwright: true, api: true };
      case '--force':
        force = true;
        break;
      case '--major':
        major = true;
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--playwright':
        playwrightFlag = true;
        break;
      case '--api':
        apiFlag = true;
        break;
      case '--cwd':
        cwdOpt = requireOptionValue(args, '--cwd');
        break;
      case '--link-packages':
        linkPackagesDir = requireOptionValue(args, '--link-packages');
        break;
      default:
        if (next.startsWith('-')) {
          throw new CliError(`Unknown option: ${next}`, 'INIT_ARGS_INVALID');
        }
        positional.push(next);
    }
  }

  const commandToken = positional[0];
  const resolvedCwd = cwdOpt ?? cwd;
  const anyAdapter = playwrightFlag || apiFlag;
  const base: ParsedArgs = {
    command: 'help',
    cwd: resolvedCwd,
    force,
    major,
    dryRun,
    playwright: anyAdapter ? playwrightFlag : true,
    api: anyAdapter ? apiFlag : true,
  };

  if (commandToken === undefined || commandToken === 'help') {
    return base;
  }

  switch (commandToken) {
    case 'version':
      return { ...base, command: 'version' };
    case 'upgrade':
      return { ...base, command: 'upgrade' };
    case 'init': {
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
    default:
      throw new CliError(`Unknown command: ${commandToken}`, 'UNKNOWN_COMMAND');
  }
}

export const HELP_TEXT = `Usage:
  qakit init <name> [--playwright] [--api] [--force] [--cwd <dir>]
  qakit version
  qakit upgrade [--major] [--dry-run] [--cwd <dir>]
  qakit --help

init scaffolds a consumer project. With no adapter flags, both Playwright and API are included.
  --playwright  add @qakit/playwright, ui example, and qakit.playwright.json
  --api         add @qakit/api and an api example
  Passing either flag installs only the adapters you list (core is always included).
version prints installed @qakit package versions.
upgrade bumps pinned @qakit/* versions in package.json (not tests). Use --major for a major bump.
`;
