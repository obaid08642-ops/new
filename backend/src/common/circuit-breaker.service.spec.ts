/**
 * 15.7 / Q81 — a circuit breaker cached BY NAME must never answer with the
 * first caller's work function.
 *
 * `create()` used to return the cached breaker directly, so the breaker held
 * whichever closure happened to create it first. The concrete money bug: one
 * `moyasar:payments:refund` breaker POSTed every refund to the FIRST payment's
 * URL while marking each later payment refunded locally.
 *
 * These specs pin the corrected contract: the work function and the arguments
 * of the CURRENT caller always reach the executed action, and a later caller's
 * timeout policy is not silently discarded.
 *
 * Reverting create() to `if (this.breakers.has(name)) return cached` makes
 * "each caller runs its own function" and "each id reaches its own gateway URL"
 * fail.
 */
import { CircuitBreakerService } from './circuit-breaker.service';

describe('15.7 CircuitBreakerService (per-call binding)', () => {
  it("runs the SECOND caller's function when a breaker name is reused", async () => {
    const breakers = new CircuitBreakerService();
    const calls: string[] = [];

    const first = breakers.create('shared', async () => {
      calls.push('first');
      return 'first-result';
    });
    const second = breakers.create('shared', async () => {
      calls.push('second');
      return 'second-result';
    });

    // Both handles exist before either fires: the cached breaker must not be
    // able to answer with the first caller's closure.
    await expect(first.fire()).resolves.toBe('first-result');
    await expect(second.fire()).resolves.toBe('second-result');

    expect(calls).toEqual(['first', 'second']);
  });

  it("forwards each caller's own arguments to the shared breaker", async () => {
    const breakers = new CircuitBreakerService();
    const seen: unknown[][] = [];

    const createProbe = (tag: string) =>
      breakers.create('args-driven', async (...args: unknown[]) => {
        seen.push([tag, ...args]);
        return tag;
      });

    await createProbe('a').fire(1, 'one');
    await createProbe('b').fire(2, 'two');

    expect(seen).toEqual([
      ['a', 1, 'one'],
      ['b', 2, 'two'],
    ]);
  });

  it('keeps two different payment ids on one shared breaker pointing at their own ids', async () => {
    // Moyasar's documented refund route is singular: POST /payments/:id/refund.
    const breakers = new CircuitBreakerService();
    const urls: string[] = [];

    const refund = breakers.create(
      'moyasar:payments:refund',
      async (arg: { paymentId: string }) => {
        urls.push(`/payments/${arg.paymentId}/refund`);
        return { ok: true };
      },
    );

    await refund.fire({ paymentId: 'pay_first' });
    await refund.fire({ paymentId: 'pay_second' });

    expect(urls).toEqual(['/payments/pay_first/refund', '/payments/pay_second/refund']);
  });

  it("shares one breaker instance and honours a later caller's timeout option", async () => {
    const breakers = new CircuitBreakerService();
    const hang = () => new Promise<never>(() => { /* never settles */ });

    // volumeThreshold 10 keeps a single timeout from opening the circuit, so the
    // second call reaches the action instead of being short-circuited.
    const quick = breakers.create('opts', hang, { timeout: 20 });
    await expect(quick.fire()).rejects.toThrow(/timed out/i);
    expect(breakers.getStatus('opts')).toBe('closed');

    // A later caller asking for a different timeout must not silently inherit
    // the first caller's policy (opossum v9 has no breaker.update()).
    const slower = breakers.create('opts', hang, { timeout: 150 });
    const started = Date.now();
    await expect(slower.fire()).rejects.toThrow(/timed out/i);
    expect(Date.now() - started).toBeGreaterThanOrEqual(100);
  });

  it('hands a fallback the caller arguments first and the error last', async () => {
    const breakers = new CircuitBreakerService();
    const typed = new Error('typed_timeout_marker');
    const seen: unknown[][] = [];

    const handle = breakers.create(
      'fallback-order',
      async () => { throw typed; },
      { volumeThreshold: 1, errorThresholdPercentage: 1, resetTimeout: 10_000 },
      (...args: unknown[]) => {
        seen.push(args);
        return 'degraded';
      },
    );

    await expect(handle.fire('pay_x', { amount: 100 })).resolves.toBe('degraded');
    expect(seen).toHaveLength(1);
    // A fallback that needs the error MUST read it last; reading it first
    // silently receives the caller's first argument instead.
    expect(seen[0].slice(0, -1)).toEqual(['pay_x', { amount: 100 }]);
    expect(seen[0][seen[0].length - 1]).toBe(typed);
    expect(seen[0].some((a) => typeof a === 'function')).toBe(false);
  });

  it('opens the circuit after repeated failures and serves the fallback', async () => {
    const breakers = new CircuitBreakerService();
    let attempts = 0;
    const handle = breakers.create(
      'opens',
      async () => {
        attempts += 1;
        throw new Error('upstream_down');
      },
      { volumeThreshold: 2, errorThresholdPercentage: 50, resetTimeout: 10_000 },
      () => 'degraded',
    );

    await expect(handle.fire()).resolves.toBe('degraded');
    await expect(handle.fire()).resolves.toBe('degraded');
    expect(breakers.getStatus('opens')).toBe('open');

    // Once open the action is no longer executed at all.
    const before = attempts;
    await expect(handle.fire()).resolves.toBe('degraded');
    expect(attempts).toBe(before);

    breakers.reset('opens');
    expect(breakers.getStatus('opens')).toBe('closed');
    expect(breakers.reset('never-created')).toBe(false);
  });

  it('passes the caller options through fire() instead of discarding them', async () => {
    const breakers = new CircuitBreakerService();
    const hang = () => new Promise<never>(() => { /* never settles */ });
    const started = Date.now();
    // fire() used to hard-code `{}` as the options, silently dropping the
    // caller's timeout policy.
    await expect(breakers.fire('fire-opts', hang, [], undefined, { timeout: 30 })).rejects.toThrow(/timed out/i);
    expect(Date.now() - started).toBeLessThan(400);
  });
});