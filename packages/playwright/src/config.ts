export const PLAYWRIGHT_EXTENSION_VERSION = '1.0.0';

export type PlaywrightBrowserName = 'chromium' | 'firefox' | 'webkit';
export type ArtifactPolicy = 'on' | 'off' | 'only-on-failure';
export type TracePolicy = 'on' | 'off' | 'retain-on-failure';
export type VideoPolicy = 'on' | 'off' | 'retain-on-failure';

export interface PlaywrightConfig {
  browser?: PlaywrightBrowserName;
  headless?: boolean;
  screenshot?: ArtifactPolicy;
  trace?: TracePolicy;
  video?: VideoPolicy;
  baseURL?: string;
}

export const DEFAULT_PLAYWRIGHT_CONFIG: Required<
  Omit<PlaywrightConfig, 'baseURL'>
> & { baseURL?: string } = {
  browser: 'chromium',
  headless: true,
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure',
  video: 'off',
};

export function resolvePlaywrightConfig(config: PlaywrightConfig = {}): {
  browser: PlaywrightBrowserName;
  headless: boolean;
  screenshot: ArtifactPolicy;
  trace: TracePolicy;
  video: VideoPolicy;
  baseURL?: string;
} {
  const resolved = {
    browser: config.browser ?? DEFAULT_PLAYWRIGHT_CONFIG.browser,
    headless: config.headless ?? DEFAULT_PLAYWRIGHT_CONFIG.headless,
    screenshot: config.screenshot ?? DEFAULT_PLAYWRIGHT_CONFIG.screenshot,
    trace: config.trace ?? DEFAULT_PLAYWRIGHT_CONFIG.trace,
    video: config.video ?? DEFAULT_PLAYWRIGHT_CONFIG.video,
  };
  const baseURL = config.baseURL;
  if (baseURL !== undefined) {
    return { ...resolved, baseURL };
  }
  return resolved;
}
