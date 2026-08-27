import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ConfigurationError } from '@qakit/contracts';

const CONFIG_TEMPLATE = `import { defineConfig } from '@qakit/core';

export default defineConfig({
  project: 'example-project',
  environment: 'development',
});
`;

export async function initProject(
  cwd: string,
  options: { force?: boolean } = {},
): Promise<string> {
  const target = join(cwd, 'qakit.config.ts');
  if (existsSync(target) && options.force !== true) {
    throw new ConfigurationError(`Configuration already exists at ${target}. Use --force to overwrite.`, {
      code: 'CONFIG_ALREADY_EXISTS',
      context: { target },
    });
  }
  await writeFile(target, CONFIG_TEMPLATE, 'utf8');
  return target;
}
