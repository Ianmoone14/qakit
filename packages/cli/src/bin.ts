#!/usr/bin/env node
import { Command } from 'commander';
import { initProject } from './commands/init.js';
import { CLI_VERSION, getVersionInfo } from './commands/version.js';

const program = new Command()
  .name('qakit')
  .description('QAKit CLI')
  .version(CLI_VERSION);

program
  .command('init')
  .description('Scaffold a qakit.config.ts in the current directory')
  .option('--force', 'overwrite an existing config file')
  .action(async (options: { force?: boolean }) => {
    const target = await initProject(process.cwd(), options);
    console.log(`Wrote ${target}`);
  });

program
  .command('version')
  .description('Print QAKit package versions')
  .action(() => {
    console.log(JSON.stringify(getVersionInfo(), null, 2));
  });

program.parse();
