import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { FrameworkError } from '@qakit/core';

export const PLAYWRIGHT_SETTINGS_FILE = 'qakit.playwright.json';

export interface PlaywrightFileConfig {
  headless?: boolean;
  screenshotOnFailure?: boolean;
  traceOnFailure?: boolean;
}

const KEYS = ['headless', 'screenshotOnFailure', 'traceOnFailure'] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Team Playwright defaults. Core does not read this file.
 * Explicit `registerPlaywright` / `runUiTest` options override these values.
 */
export function loadPlaywrightFileConfig(cwd = process.cwd()): PlaywrightFileConfig {
  const filePath = path.resolve(cwd, PLAYWRIGHT_SETTINGS_FILE);
  if (!existsSync(filePath)) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  } catch (cause) {
    throw new FrameworkError(`Invalid ${PLAYWRIGHT_SETTINGS_FILE}`, {
      code: 'PLAYWRIGHT_CONFIG_INVALID',
      context: { path: filePath },
      cause,
    });
  }

  if (!isPlainObject(parsed)) {
    throw new FrameworkError(`${PLAYWRIGHT_SETTINGS_FILE} must be a JSON object`, {
      code: 'PLAYWRIGHT_CONFIG_INVALID',
      context: { path: filePath },
    });
  }

  const unknown = Object.keys(parsed).filter((key) => !KEYS.includes(key as (typeof KEYS)[number]));
  if (unknown.length > 0) {
    throw new FrameworkError(`${PLAYWRIGHT_SETTINGS_FILE} has unknown keys: ${unknown.join(', ')}`, {
      code: 'PLAYWRIGHT_CONFIG_INVALID',
      context: { path: filePath, keys: unknown },
    });
  }

  const config: PlaywrightFileConfig = {};
  for (const key of KEYS) {
    if (!(key in parsed)) {
      continue;
    }
    const value = parsed[key];
    if (typeof value !== 'boolean') {
      throw new FrameworkError(`${PLAYWRIGHT_SETTINGS_FILE} field "${key}" must be a boolean`, {
        code: 'PLAYWRIGHT_CONFIG_INVALID',
        context: { path: filePath, key },
      });
    }
    config[key] = value;
  }
  return config;
}

export function resolvePlaywrightOptions(
  file: PlaywrightFileConfig,
  overrides: PlaywrightFileConfig = {},
): PlaywrightFileConfig & { headless: boolean } {
  const headless = overrides.headless ?? file.headless ?? true;
  const screenshotOnFailure = overrides.screenshotOnFailure ?? file.screenshotOnFailure ?? false;
  const traceOnFailure = overrides.traceOnFailure ?? file.traceOnFailure ?? false;
  const resolved: PlaywrightFileConfig & { headless: boolean } = { headless };
  if (screenshotOnFailure) {
    resolved.screenshotOnFailure = true;
  }
  if (traceOnFailure) {
    resolved.traceOnFailure = true;
  }
  return resolved;
}
