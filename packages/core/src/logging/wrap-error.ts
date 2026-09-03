import { ExecutionError, QakitError } from '@qakit/contracts';

/**
 * Ensures callers see a `QakitError`. Existing QAKit errors pass through unchanged.
 */
export function wrapError(error: unknown): QakitError {
  if (error instanceof QakitError) {
    return error;
  }

  if (error instanceof Error) {
    return new ExecutionError(error.message, {
      code: 'UNEXPECTED_ERROR',
      cause: error,
    });
  }

  return new ExecutionError('Non-error value thrown', {
    code: 'UNEXPECTED_ERROR',
    context: { thrown: error },
  });
}
