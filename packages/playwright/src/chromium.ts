import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

/** True when `playwright install chromium` has placed a local browser binary. */
export function isChromiumInstalled(): boolean {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}
