export class MigrationError extends Error {
  constructor(message: string, opt?: ErrorOptions) {
    super(message, opt);
    this.name = 'MigrationError';
  }
}
