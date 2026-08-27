import { FrameworkError } from '@qakit/contracts';
import type { ServiceRegistry } from '@qakit/contracts';

export class InMemoryServiceRegistry implements ServiceRegistry {
  readonly #services = new Map<string, unknown>();

  register<T>(name: string, service: T): void {
    this.#services.set(name, service);
  }

  get<T>(name: string): T {
    if (!this.#services.has(name)) {
      throw new FrameworkError(`Service '${name}' is not registered`, {
        code: 'SERVICE_NOT_FOUND',
        context: { name },
      });
    }
    return this.#services.get(name) as T;
  }

  tryGet<T>(name: string): T | undefined {
    return this.#services.get(name) as T | undefined;
  }

  has(name: string): boolean {
    return this.#services.has(name);
  }
}
