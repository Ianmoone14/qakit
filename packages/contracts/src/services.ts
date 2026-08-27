/**
 * Well-known service keys. Extensions register implementations;
 * core never hard-codes Playwright or HTTP types onto the context.
 */
export const ServiceKeys = {
  Auth: 'qakit.auth',
  ApiClient: 'qakit.api.client',
  PlaywrightBrowser: 'qakit.playwright.browser',
  PlaywrightContext: 'qakit.playwright.context',
  PlaywrightPage: 'qakit.playwright.page',
} as const;

export type ServiceKey = (typeof ServiceKeys)[keyof typeof ServiceKeys] | string;

export interface ServiceRegistry {
  register<T>(name: string, service: T): void;
  get<T>(name: string): T;
  tryGet<T>(name: string): T | undefined;
  has(name: string): boolean;
}
