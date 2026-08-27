import type { Artifact } from './artifacts.js';

export const TEST_STATUSES = ['passed', 'failed', 'skipped', 'timedOut'] as const;
export type TestStatus = (typeof TEST_STATUSES)[number];

export const EXECUTION_STATUSES = ['passed', 'failed', 'cancelled'] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export interface TestError {
  message: string;
  stack?: string;
  code?: string;
}

export interface TestResult {
  testId: string;
  testName: string;
  testFile: string;
  status: TestStatus;
  duration: number;
  attempt: number;
  error?: TestError;
  artifacts: Artifact[];
  tags: string[];
}

export interface ExecutionCounts {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface ExecutionSummary {
  executionId: string;
  project: string;
  environment: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime: Date;
  duration: number;
  counts: ExecutionCounts;
  results: TestResult[];
}
