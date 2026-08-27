export class QakitError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    options: { code: string; context?: Record<string, unknown>; cause?: unknown } = {
      code: 'QAKIT_ERROR',
    },
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = options.code;
    if (options.context !== undefined) {
      this.context = options.context;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConfigurationError extends QakitError {
  constructor(
    message: string,
    options: { code?: string; context?: Record<string, unknown>; cause?: unknown } = {},
  ) {
    super(message, {
      code: options.code ?? 'CONFIGURATION_ERROR',
      ...(options.context !== undefined ? { context: options.context } : {}),
      ...(options.cause !== undefined ? { cause: options.cause } : {}),
    });
  }
}

export class FrameworkError extends QakitError {
  constructor(
    message: string,
    options: { code?: string; context?: Record<string, unknown>; cause?: unknown } = {},
  ) {
    super(message, {
      code: options.code ?? 'FRAMEWORK_ERROR',
      ...(options.context !== undefined ? { context: options.context } : {}),
      ...(options.cause !== undefined ? { cause: options.cause } : {}),
    });
  }
}

export class ExecutionError extends QakitError {
  constructor(
    message: string,
    options: { code?: string; context?: Record<string, unknown>; cause?: unknown } = {},
  ) {
    super(message, {
      code: options.code ?? 'EXECUTION_ERROR',
      ...(options.context !== undefined ? { context: options.context } : {}),
      ...(options.cause !== undefined ? { cause: options.cause } : {}),
    });
  }
}

export class IntegrationError extends QakitError {
  constructor(
    message: string,
    options: { code?: string; context?: Record<string, unknown>; cause?: unknown } = {},
  ) {
    super(message, {
      code: options.code ?? 'INTEGRATION_ERROR',
      ...(options.context !== undefined ? { context: options.context } : {}),
      ...(options.cause !== undefined ? { cause: options.cause } : {}),
    });
  }
}

export class TimeoutError extends QakitError {
  constructor(
    message: string,
    options: { code?: string; context?: Record<string, unknown>; cause?: unknown } = {},
  ) {
    super(message, {
      code: options.code ?? 'TIMEOUT_ERROR',
      ...(options.context !== undefined ? { context: options.context } : {}),
      ...(options.cause !== undefined ? { cause: options.cause } : {}),
    });
  }
}
