import { DEFAULT_CONFIG, type ResolvedConfig } from '@qakit/contracts';
import type { ConfigLayer } from './types.js';

interface MergeState {
  project?: string;
  environment: string;
  retry: { attempts: number; delay: number };
  logging: { level: ResolvedConfig['logging']['level']; format: ResolvedConfig['logging']['format'] };
  artifacts: { outputDir: string };
  extensions: ResolvedConfig['extensions'];
  baseUrl?: string;
}

function definedEntries<T extends object>(value: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(value) as (keyof T)[]) {
    const entry = value[key];
    if (entry !== undefined) {
      result[key] = entry;
    }
  }
  return result;
}

function applyLayer(state: MergeState, layer: ConfigLayer | undefined): MergeState {
  if (layer === undefined) {
    return state;
  }

  const next: MergeState = {
    environment: state.environment,
    retry: { ...state.retry },
    logging: { ...state.logging },
    artifacts: { ...state.artifacts },
    extensions: [...state.extensions],
  };

  if (state.project !== undefined) {
    next.project = state.project;
  }
  if (state.baseUrl !== undefined) {
    next.baseUrl = state.baseUrl;
  }
  if (layer.project !== undefined) {
    next.project = layer.project;
  }
  if (layer.environment !== undefined) {
    next.environment = layer.environment;
  }
  if (layer.baseUrl !== undefined) {
    next.baseUrl = layer.baseUrl;
  }
  if (layer.retry !== undefined) {
    next.retry = { ...next.retry, ...definedEntries(layer.retry) };
  }
  if (layer.logging !== undefined) {
    next.logging = { ...next.logging, ...definedEntries(layer.logging) };
  }
  if (layer.artifacts !== undefined) {
    next.artifacts = { ...next.artifacts, ...definedEntries(layer.artifacts) };
  }
  if (layer.extensions !== undefined) {
    next.extensions = [...layer.extensions];
  }

  return next;
}

export function mergeConfigLayers(
  file: ConfigLayer | undefined,
  env: ConfigLayer,
  overrides: ConfigLayer | undefined,
): MergeState {
  let state: MergeState = {
    environment: DEFAULT_CONFIG.environment,
    retry: { ...DEFAULT_CONFIG.retry },
    logging: { ...DEFAULT_CONFIG.logging },
    artifacts: { ...DEFAULT_CONFIG.artifacts },
    extensions: [...DEFAULT_CONFIG.extensions],
  };

  state = applyLayer(state, file);
  state = applyLayer(state, env);
  state = applyLayer(state, overrides);
  return state;
}

export function mergeStateToCandidate(state: MergeState): Record<string, unknown> {
  const candidate: Record<string, unknown> = {
    environment: state.environment,
    retry: { ...state.retry },
    logging: { ...state.logging },
    artifacts: { ...state.artifacts },
    extensions: [...state.extensions],
  };
  if (state.project !== undefined) {
    candidate.project = state.project;
  }
  if (state.baseUrl !== undefined) {
    candidate.baseUrl = state.baseUrl;
  }
  return candidate;
}
