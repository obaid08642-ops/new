/**
 * 15.7 — every external call has a hard abort and a shared circuit breaker.
 *
 * Two failure modes are pinned here, both of which the bare `fetch` the adapters
 * used to make had:
 *  1. NO ABORT. A circuit breaker caps how long a call is waited on, but it
 *     cannot cancel a socket, so a hung gateway kept the request open after
 *     the breaker had already given up. `externalFetch` must attach an
 *     AbortSignal and turn the abort into a typed timeout.
 *  2. NO SHARING. Each caller opened its own connection, so N failing callers
 *     never shed load together. `runExternalCall` must route through the named
 *     breaker.
 *
 * The fallback contract is pinned too: (...callerArgs, err), failure LAST.
 */
import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { externalFetch, externalUnavailable, gatewayTimeoutMs, runExternalCall } from './external-call';
import { CircuitBreakerService } from './circuit-breaker.service';

describe('15.7 externalFetch has a hard abort', () => {
  it('answers a typed timeout instead of a raw TypeError when the socket hangs', async () => {
    // A fetch that honours the abort signal and never settles on its own: the
    // abort is the ONLY thing that can end it, which is the point.
    const originalFetch = global.fetch;
    global.fetch = (async (_url: any, init: any) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError')),
        );
      })) as any;
    try {
      await expect(externalFetch('https://gateway.example/x', undefined, 20)).rejects.toThrow(
        ServiceUnavailableException,
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('leaves a real network failure as the transport error, not a fake timeout', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => {
      throw new TypeError('fetch failed');
    }) as any;
    try {
      await expect(externalFetch('https://gateway.example/x', undefined, 20)).rejects.toThrow(TypeError);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('passes the abort signal through to fetch', async () => {
    const seen: any[] = [];
    const originalFetch = global.fetch;
    global.fetch = (async (url: any, init: any) => {
      seen.push(init?.signal);
      return new Response('{}', { status: 200 });
    }) as any;
    try {
      await externalFetch('https://gateway.example/x', undefined, 50);
    } finally {
      global.fetch = originalFetch;
    }
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(AbortSignal);
  });

  it('lets a normal response through untouched', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => new Response('{"ok":true}', { status: 200 })) as any;
    try {
      const res = await externalFetch('https://gateway.example/x');
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ ok: true });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('15.7 runExternalCall routes through the named breaker', () => {
  it('rejects through the fallback once the circuit opens, and stops calling the action', async () => {
    // `externalUnavailable` throws the generic "temporarily unavailable", so
    // the call REJECTS with that — the user sees it, the load is shed.
    // volumeThreshold 2 means the circuit can only open after TWO attempts, so
    // both racers must be fired before the state is asserted.
    const breakers = new CircuitBreakerService();
    let attempts = 0;
    const fire = () =>
      runExternalCall(
        breakers,
        'sms:send',
        async () => {
          attempts += 1;
          throw new Error('provider_down');
        },
        ['+966500000000', '123456'],
        externalUnavailable,
        undefined,
        { volumeThreshold: 2, errorThresholdPercentage: 50 },
      );

    await expect(fire()).rejects.toThrow(BadGatewayException);
    expect(attempts).toBe(1);
    // One attempt is not enough to open a volumeThreshold-2 breaker.
    expect(breakers.getStatus('sms:send')).toBe('closed');

    await expect(fire()).rejects.toThrow(BadGatewayException);
    expect(attempts).toBe(2);
    expect(breakers.getStatus('sms:send')).toBe('open');

    // Once open, a later caller is short-circuited without touching the action.
    await expect(fire()).rejects.toThrow(BadGatewayException);
    expect(attempts).toBe(2);
  });

  it('re-throws a typed timeout from the fallback instead of masking it', async () => {
    const breakers = new CircuitBreakerService();
    await expect(
      runExternalCall(
        breakers,
        'ai:complete',
        async () => { throw new Error('Timed out after 3000ms'); },
        ['prompt'],
        externalUnavailable,
      ),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('maps an untyped upstream error to the generic unavailable', async () => {
    const breakers = new CircuitBreakerService();
    await expect(
      runExternalCall(
        breakers,
        'maps:geocode',
        async () => { throw new Error('connection reset'); },
        ['Riyadh'],
        externalUnavailable,
      ),
    ).rejects.toThrow(BadGatewayException);
  });

  it('hands the fallback the caller arguments first and the error last', async () => {
    const breakers = new CircuitBreakerService();
    const seen: unknown[][] = [];
    await runExternalCall(
      breakers,
      'storage:upload',
      async () => { throw new Error('s3_down'); },
      ['bucket', { key: 'k' }],
      (...args: unknown[]) => {
        seen.push(args);
        return 'degraded' as any;
      },
    );
    expect(seen).toHaveLength(1);
    expect(seen[0].slice(0, -1)).toEqual(['bucket', { key: 'k' }]);
    expect(String(seen[0][seen[0].length - 1])).toContain('s3_down');
  });

  it('runs the action directly when no breaker is injected', async () => {
    const out = await runExternalCall(
      undefined,
      'no-breaker',
      async (a: number, b: number) => a + b,
      [2, 3],
      externalUnavailable,
    );
    expect(out).toBe(5);
  });
});

describe('15.7 the timeout budget is env-overridable and defaults to 10s', () => {
  it('defaults to 10000ms', () => {
    delete process.env.PAYMENT_GATEWAY_TIMEOUT_MS;
    expect(gatewayTimeoutMs()).toBe(10_000);
  });

  it('honours PAYMENT_GATEWAY_TIMEOUT_MS', () => {
    process.env.PAYMENT_GATEWAY_TIMEOUT_MS = '2500';
    expect(gatewayTimeoutMs()).toBe(2500);
    delete process.env.PAYMENT_GATEWAY_TIMEOUT_MS;
  });
});