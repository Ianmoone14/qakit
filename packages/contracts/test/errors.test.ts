import { describe, expect, it } from 'vitest';
import {
  ConfigurationError,
  ExecutionError,
  FrameworkError,
  IntegrationError,
  QakitError,
  TimeoutError,
} from '../src/errors.js';

describe('error classes', () => {
  it('preserves code, context, and cause', () => {
    const cause = new Error('native');
    const error = new ConfigurationError('bad config', {
      code: 'INVALID_PROJECT',
      context: { project: 'Nope' },
      cause,
    });
    expect(error).toBeInstanceOf(QakitError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('INVALID_PROJECT');
    expect(error.context).toEqual({ project: 'Nope' });
    expect(error.cause).toBe(cause);
    expect(error.name).toBe('ConfigurationError');
  });

  it('uses default codes per subclass', () => {
    expect(new ConfigurationError('x').code).toBe('CONFIGURATION_ERROR');
    expect(new FrameworkError('x').code).toBe('FRAMEWORK_ERROR');
    expect(new ExecutionError('x').code).toBe('EXECUTION_ERROR');
    expect(new IntegrationError('x').code).toBe('INTEGRATION_ERROR');
    expect(new TimeoutError('x').code).toBe('TIMEOUT_ERROR');
  });
});
