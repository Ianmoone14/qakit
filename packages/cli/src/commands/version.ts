import { QAKIT_VERSION } from '@qakit/contracts';
import { CORE_VERSION } from '@qakit/core';

export const CLI_VERSION = '0.1.0';

export interface VersionInfo {
  qakit: string;
  packages: Record<string, string>;
}

export function getVersionInfo(): VersionInfo {
  return {
    qakit: CLI_VERSION,
    packages: {
      '@qakit/cli': CLI_VERSION,
      '@qakit/core': CORE_VERSION,
      '@qakit/contracts': QAKIT_VERSION,
    },
  };
}
