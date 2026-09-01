import {
  CONTRACTS_PACKAGE,
  CONTRACTS_VERSION,
  QAKIT_NAME,
  type FrameworkVersion,
} from '@qakit/contracts';
import { CORE_PACKAGE, CORE_VERSION } from '../package-info.js';

export function frameworkVersion(): FrameworkVersion {
  return {
    name: QAKIT_NAME,
    version: CORE_VERSION,
    packages: {
      [CORE_PACKAGE]: CORE_VERSION,
      [CONTRACTS_PACKAGE]: CONTRACTS_VERSION,
    },
  };
}
