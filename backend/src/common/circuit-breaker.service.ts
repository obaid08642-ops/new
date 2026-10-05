import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';

export interface BreakerOptions {
  /** false = no breaker timeout (the wrapped call enforces its own). */
  timeout?: number | false;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreaker<any, any>>();

  create<T>(
    name: string,
    fn: (...args: any[]) => Promise<T>,
    options: BreakerOptions = {},
    fallback?: (...args: any[]) => T | Promise<T>,
  ): CircuitBreaker<any[], T> {
    if (this.breakers.has(name)) {
      return this.breakers.get(name)!;
    }
    const breaker = new CircuitBreaker(fn, {
      timeout: options.timeout ?? 3000,
      errorThresholdPercentage: options.errorThresholdPercentage ?? 50,
      resetTimeout: options.resetTimeout ?? 30000,
      volumeThreshold: options.volumeThreshold ?? 10,
      name,
    });
    if (fallback) {
      breaker.fallback(fallback);
    }
    breaker.on('open', () =>
      this.logger.warn(`⚡ Circuit OPEN [${name}] — serving from fallback`),
    );
    breaker.on('halfOpen', () =>
      this.logger.log(`🔄 Circuit HALF-OPEN [${name}] — testing recovery`),
    );
    breaker.on('close', () =>
      this.logger.log(`✅ Circuit CLOSED [${name}] — fully recovered`),
    );
    breaker.on('fallback', () =>
      this.logger.warn(`🔀 Fallback fired [${name}]`),
    );
    this.breakers.set(name, breaker);
    return breaker;
  }

  async fire<T>(
    name: string,
    fn: (...args: any[]) => Promise<T>,
    args: any[] = [],
    fallback?: () => T | Promise<T>,
  ): Promise<T> {
    const breaker = this.create(name, fn, {}, fallback);
    return breaker.fire(...args);
  }

  /**
   * Run `fn(...args)` through the named breaker, with no fallback: while the
   * circuit is open the call rejects at once without reaching the dependency,
   * and the caller's own error handling applies. `fn` must take everything it
   * needs as arguments, because breakers are cached by name.
   */
  async call<A extends unknown[], T>(name: string, fn: (...args: A) => Promise<T>, args: A, options: BreakerOptions = { timeout: false }): Promise<T> {
    return this.create<T>(name, fn as (...a: unknown[]) => Promise<T>, options).fire(...args);
  }

  getStats(name: string) {
    return this.breakers.get(name)?.stats;
  }
}
