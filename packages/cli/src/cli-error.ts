export class CliError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'CliError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
