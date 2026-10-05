/**
 * F6 — pin the opossum fallback-argument-order assumption.
 *
 * `CircuitBreakerService` (and every `gatewayUnavailable` fallback) relies on
 * opossum invoking the registered function as `fn(...fireArgs, err)` — the
 * failure LAST. If a future opossum upgrade inverts that order, every typed
 * failure (timeouts, 503s) is silently mistyped downstream. These tests run
 * against the REAL installed opossum build and fail on any such change:
 *   1. the installed major version is pinned (a major bump forces review),
 *   2. raw opossum invokes fallback as (...fireArgs, err),
 *   3. the service wrapper strips the per-call work function and still hands
 *      the fallback (...callerArgs, err).
 */
import CircuitBreaker from 'opossum';
import { CircuitBreakerService } from './circuit-breaker.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: opossumVersion } = require('opossum/package.json');

describe('opossum fallback contract (pinned, real build)', () => {
  it('pins the installed opossum major version', () => {
    expect(opossumVersion).toBe('9.0.0');
  });

  it('raw opossum invokes fallback as (...fireArgs, err)', async () => {
    const typed = new Error('typed_failure_marker');
    const seen: unknown[][] = [];
    const raw = new CircuitBreaker(
      async (...args: unknown[]) => {
        throw typed;
      },
      { timeout: 3000, errorThresholdPercentage: 50, resetTimeout: 30000 },
    );
    raw.fallback((...fbArgs: unknown[]) => {
      seen.push(fbArgs);
      return 'fallback-result';
    });

    await expect(raw.fire('A1', 'B2')).resolves.toBe('fallback-result');
    expect(seen).toEqual([['A1', 'B2', typed]]);
    raw.shutdown();
  });

  it('service wrapper forwards (...callerArgs, err) with the work function stripped', async () => {
    const breakers = new CircuitBreakerService();
    const typed = new Error('typed_timeout_marker');
    const seen: unknown[][] = [];
    const handle = breakers.create(
      'contract-strip',
      async () => {
        throw typed;
      },
      { volumeThreshold: 1, errorThresholdPercentage: 1, resetTimeout: 10_000 },
      (...args: unknown[]) => {
        seen.push(args);
        return 'degraded';
      },
    );

    await expect(handle.fire('pay_x', { amount: 100 })).resolves.toBe('degraded');
    // No function in the forwarded args; the typed error is last.
    expect(seen).toHaveLength(1);
    expect(seen[0].slice(0, -1)).toEqual(['pay_x', { amount: 100 }]);
    expect(seen[0][seen[0].length - 1]).toBe(typed);
    expect(seen[0].some((a) => typeof a === 'function')).toBe(false);
  });
});
