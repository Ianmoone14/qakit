import type { QakitConfig } from '@qakit/contracts';

/**
 * Typed helper for `qakit.config.ts`. Returns the same object.
 *
 * @example
 * export default defineConfig({
 *   project: 'checkout-api',
 *   environment: 'development',
 * });
 */
export function defineConfig(config: QakitConfig): QakitConfig {
  return config;
}
