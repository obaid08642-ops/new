import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';

export interface BreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
}

/**
 * Firable handle returned by {@link CircuitBreakerService.create}.
 *
 * The breaker *instance* (counters, open/half-open/closed state, timeout and
 * threshold policy) is shared per name; the work function is not. `fire(...args)`
 * hands the work function and the arguments to the shared action together, so a
 * cached breaker can never answer a later caller with the first caller's
 * closure.
 *
 * Fallback contract: the fallback runs as
 * `fallback(...callerArgs, err)` — the caller's own arguments first, the
 * failure last (this mirrors opossum, which invokes the registered function
 * as `fn(...fireArgs, err)`; the leading per-call work function is stripped
 * here). A fallback that needs the error MUST read it as its last parameter;
 * reading it as the first parameter silently receives the caller's first
 * argument instead (e.g. a payment body) and mistypes every failure.
 */
export interface BreakerHandle<T> {
  fire(...args: any[]): Promise<T>;
}

/** Options opossum re-reads per call/event, so they can be re-applied in place. */
const LIVE_OPTIONS: Array<keyof BreakerOptions> = [
  'timeout',
  'errorThresholdPercentage',
  'resetTimeout',
  'volumeThreshold',
];

/**
 * Shared action for every breaker. opossum v9 always executes the function the
 * breaker was constructed with (`fire()` ignores its first argument, and
 * `call()` only re-binds `this`), so the only way for one cached instance to
 * serve N different work functions is for the work function to travel WITH the
 * arguments of the very invocation that needs it. Because `fn` rides along in
 * the same call, there is no shared mutable slot and concurrent calls cannot
 * observe each other's function.
 */
async function dispatch(fn: unknown, ...args: any[]): Promise<unknown> {
  if (typeof fn !== 'function') {
    throw new Error('circuit_breaker_action_missing');
  }
  return (fn as (...a: any[]) => unknown)(...args);
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreaker<any[], any>>();

  /**
   * Create (or reuse) the breaker named `name` and return a handle bound to
   * `fn`.
   *
   * Q81: the breaker is cached BY NAME, so it can only ever hold the work
   * function of whichever caller happened to create it first. Holding `fn` on
   * the breaker made the first caller's closure win for the whole process
   * lifetime — e.g. `MoyasarService.refundPayment` POSTed every refund to the
   * FIRST payment's `/refunds` while marking each later payment refunded
   * locally.
   *
   * Call sites should still be *args-driven* (pass the payment id as an
   * argument, never capture it in a closure) so the work function stays
   * stateless and correct even when the breaker is bypassed entirely.
   *
   * The optional `fallback` runs as `fallback(...callerArgs, err)`: the
   * caller's own arguments first, the failure last. A fallback that re-throws
   * typed errors (timeouts, 503s) must read the error from its LAST parameter.
   */
  create<T>(
    name: string,
    fn: (...args: any[]) => Promise<T>,
    options: BreakerOptions = {},
    fallback?: (...args: any[]) => T | Promise<T>,
  ): BreakerHandle<T> {
    const breaker = this.breakerFor(name, options, fallback);
    return { fire: (...args: any[]) => breaker.fire(fn, ...args) };
  }

  /** The shared breaker instance for `name`, created on first use. */
  private breakerFor(
    name: string,
    options: BreakerOptions,
    fallback?: (...args: any[]) => any,
  ): CircuitBreaker<any[], any> {
    const wrappedFallback = fallback
      ? (fn: unknown, ...rest: any[]): any => {
          // opossum invokes the registered function as fn(...fireArgs, err),
          // where fireArgs[0] is the per-call work function. Strip the work
          // function and forward (...callerArgs, err): dropping err here would
          // hand the fallback the caller's first argument as "the error" and
          // every typed failure (timeouts, 503s) would be mistyped downstream.
          const err = rest.pop();
          return fallback(...rest, err);
        }
      : undefined;

    let breaker = this.breakers.get(name);
    if (breaker) {
      this.applyOptions(breaker, name, options);
      if (wrappedFallback) breaker.fallback(wrappedFallback);
      return breaker;
    }

    const resolved: BreakerOptions = {
      timeout: options.timeout ?? 3000,
      errorThresholdPercentage: options.errorThresholdPercentage ?? 50,
      resetTimeout: options.resetTimeout ?? 30000,
      volumeThreshold: options.volumeThreshold ?? 10,
    };

    breaker = new CircuitBreaker(dispatch, { ...resolved, name });

    if (wrappedFallback) {
      breaker.fallback(wrappedFallback);
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

  /**
   * Re-apply explicitly-passed options to an already-cached breaker. opossum v9
   * dropped `breaker.update()`, and it reads `this.options.*` at call time, so
   * assigning in place keeps a later caller's timeout policy effective instead
   * of silently keeping the first caller's.
   */
  private applyOptions(
    breaker: CircuitBreaker<any[], any>,
    name: string,
    options: BreakerOptions,
  ): void {
    const target = (breaker as unknown as { options: Record<string, unknown> }).options;
    for (const key of LIVE_OPTIONS) {
      const value = options[key];
      if (value !== undefined && target[key] !== value) {
        target[key] = value;
        this.logger.log(
          `🔧 Circuit options updated [${name}] ${key}=${String(value)}`,
        );
      }
    }
  }

  async fire<T>(
    name: string,
    fn: (...args: any[]) => Promise<T>,
    args: any[] = [],
    fallback?: (...args: any[]) => T | Promise<T>,
    options: BreakerOptions = {},
  ): Promise<T> {
    // Same per-call binding as create(): `fn` is this call's work function.
    // F5: the caller's options travel with the call — previously `{}` was
    // passed, silently discarding per-call timeout/threshold policy.
    return this.create(name, fn, options, fallback).fire(...args);
  }

  getStats(name: string) {
    return this.breakers.get(name)?.stats;
  }

  /**
   * Force a breaker closed (operational escape hatch and test seam). The
   * instance is kept, so its counters and its place in the shared-state map
   * survive; only the open/half-open state is cleared.
   */
  reset(name: string): boolean {
    const breaker = this.breakers.get(name);
    if (!breaker) return false;
    breaker.close();
    return true;
  }

  /**
   * Current state of a breaker by name. opossum v9's `breaker.status` is a
   * rolling-statistics object, not a state name, so the state is read from the
   * dedicated `opened` / `halfOpen` / `closed` getters.
   */
  getStatus(name: string): 'open' | 'half-open' | 'closed' | undefined {
    const breaker = this.breakers.get(name);
    if (!breaker) return undefined;
    if (breaker.opened) return 'open';
    if (breaker.halfOpen) return 'half-open';
    return 'closed';
  }
}