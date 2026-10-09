/**
 * Q81 — circuit breakers are cached BY NAME, so the breaker instance can only
 * ever hold the work function of whichever caller created it first. These specs
 * pin the fixed contract: the work function and the arguments of the CURRENT
 * caller always reach the executed action.
 *
 * Reverting `CircuitBreakerService.create()` to the previous
 * `if (this.breakers.has(name)) return this.breakers.get(name)!` makes
 * "two callers of the same breaker name each run their own function" fail.
 */
import { CircuitBreakerService } from './circuit-breaker.service';

const fn = () => undefined;

describe('CircuitBreakerService (Q81 per-call binding)', () => {
  it('runs the SECOND caller\'s function when a breaker name is reused', async () => {
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

  it('forwards each caller\'s own arguments to the shared breaker', async () => {
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
    // The concrete shape of the defect: one breaker name, the id arrives as an
    // argument, and every id must reach the gateway URL that is built from it.
    const breakers = new CircuitBreakerService();
    const urls: string[] = [];

    const refund = breakers.create(
      'moyasar:payments:refund',
      async (arg: { paymentId: string }) => {
        urls.push(`/payments/${arg.paymentId}/refunds`);
        return { ok: true };
      },
    );

    await refund.fire({ paymentId: 'pay_first' });
    await refund.fire({ paymentId: 'pay_second' });

    expect(urls).toEqual(['/payments/pay_first/refunds', '/payments/pay_second/refunds']);
  });

  it('shares one breaker instance and honours a later caller\'s timeout option', async () => {
    const breakers = new CircuitBreakerService();
    const hang = () => new Promise<never>(() => { /* never settles */ });

    // volumeThreshold 10 keeps a single timeout from opening the circuit, so the
    // second call reaches the action instead of being short-circuited.
    const quick = breakers.create('opts', hang, { timeout: 20 });
    await expect(quick.fire()).rejects.toThrow(/timed out/i);
    expect(breakers.getStats('opts')?.opens).toBe(0);

    // A later caller asking for a different timeout must not silently inherit
    // the first caller's policy (opossum v9 has no breaker.update()).
    const slower = breakers.create('opts', hang, { timeout: 120 });
    const started = Date.now();
    await expect(slower.fire()).rejects.toThrow(/timed out/i);
    expect(Date.now() - started).toBeGreaterThanOrEqual(100);

    // One shared instance: both calls were counted by the same breaker.
    expect(breakers.getStats('opts')?.timeouts).toBe(2);
    expect(breakers.getStats('opts')?.opens).toBe(0);
  });

  it('serves the fallback with the caller arguments when the circuit is open', async () => {
    const breakers = new CircuitBreakerService();
    const failing = breakers.create(
      'fb',
      async () => {
        throw new Error('gateway down');
      },
      { volumeThreshold: 1, errorThresholdPercentage: 1, resetTimeout: 10_000 },
      (paymentId: string) => `degraded:${paymentId}`,
    );

    await expect(failing.fire('pay_a')).resolves.toBe('degraded:pay_a');
    await expect(failing.fire('pay_b')).resolves.toBe('degraded:pay_b');
    expect(breakers.getStats('fb')?.opens).toBeGreaterThan(0);
  });

  it('hands the fallback the caller args first and the failure last', async () => {
    // Regression: the wrapper once dropped the error, so a fallback reading
    // its first parameter as "the error" received the caller's first argument
    // (e.g. a payment body) and mistyped every failure downstream.
    const breakers = new CircuitBreakerService();
    const seen: unknown[][] = [];
    const typed = new Error('typed_timeout_marker');
    const guarded = breakers.create(
      'fb-err',
      async () => {
        throw typed;
      },
      { volumeThreshold: 1, errorThresholdPercentage: 1, resetTimeout: 10_000 },
      (...args: unknown[]) => {
        seen.push(args);
        throw args[args.length - 1];
      },
    );

    await expect(guarded.fire('pay_a')).rejects.toBe(typed);
    // (callerArgs..., err): the caller's argument first, the failure last.
    expect(seen).toEqual([['pay_a', typed]]);
  });

  it('fire() uses the default timeout when no options are supplied', async () => {
    const breakers = new CircuitBreakerService();
    const hang = () => new Promise<never>(() => { /* never settles */ });

    const started = Date.now();
    await expect(
      breakers.fire('fire-opts', hang, []),
    ).rejects.toThrow(/timed out/i);
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(2500);
    expect(elapsed).toBeLessThan(5000);
  });

  it('fire() binds the per-call function instead of dropping it', async () => {    const breakers = new CircuitBreakerService();
    const urls: string[] = [];

    const refund = async (paymentId: string) => {
      urls.push(`/payments/${paymentId}/refunds`);
      return paymentId;
    };

    await expect(breakers.fire('svc-fire', refund, ['pay_one'])).resolves.toBe('pay_one');
    await expect(breakers.fire('svc-fire', refund, ['pay_two'])).resolves.toBe('pay_two');

    expect(urls).toEqual(['/payments/pay_one/refunds', '/payments/pay_two/refunds']);
  });
});