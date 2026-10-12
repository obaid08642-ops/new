/**
 * 15.7 — the payment adapters have a hard abort and a shared breaker.
 *
 * The three adapters used a bare `fetch`: no AbortSignal (so a hung gateway
 * kept the socket open after the breaker had already given up) and no breaker
 * (so N failing callers each opened their own connection). These specs pin
 * both, plus the two contracts a refund must not get wrong:
 *  - Moyasar's route is SINGULAR: POST /payments/:id/refund.
 *  - the request body is built from the ARGUMENT, never captured in a closure,
 *    because the breaker is cached by name.
 */
import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { MoyasarAdapter, StripeAdapter, TapAdapter } from './payments.module';

const realFetch = global.fetch;

function mockFetch(impl: (url: string, init?: any) => Promise<Response>) {
  global.fetch = (async (url: any, init: any) => impl(String(url), init)) as any;
}
const restore = () => { global.fetch = realFetch; };

describe('15.7 the payment adapters abort and share a breaker', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
    restore();
  });

  it('times out a hung gateway even with NO breaker injected', async () => {
    // 15.7 asks for a timeout AND a breaker on every external call, so the
    // abort must not disappear when a caller has no breaker to hand in.
    process.env.PAYMENT_GATEWAY_TIMEOUT_MS = '20';
    mockFetch(async (_url, init) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted.', 'AbortError')),
      );
    }));
    await expect(
      new TapAdapter().createIntent({ amount: 50, currency: 'SAR', description: 'd', metadata: {} }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('attaches an AbortSignal to every gateway request', async () => {
    const signals: any[] = [];
    mockFetch(async (_url, init) => {
      signals.push(init?.signal);
      return new Response('{}', { status: 200 });
    });
    await new StripeAdapter().createIntent({ amount: 50, currency: 'sar', description: 'd', metadata: {} });
    expect(signals).toHaveLength(1);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
  });

  it('turns a hung gateway into a typed timeout, not an open socket', async () => {
    process.env.PAYMENT_GATEWAY_TIMEOUT_MS = '20';
    mockFetch(async (_url, init) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted.', 'AbortError')),
      );
    }));
    await expect(
      new TapAdapter().createIntent({ amount: 50, currency: 'SAR', description: 'd', metadata: {} }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('surfaces the gateway message on a non-2xx instead of a generic error', async () => {
    mockFetch(async () => new Response(JSON.stringify({ error: { message: 'card_declined' } }), { status: 402 }));
    await expect(
      new StripeAdapter().createIntent({ amount: 50, currency: 'sar', description: 'd', metadata: {} }),
    ).rejects.toThrow(BadGatewayException);
  });

  it('posts a Moyasar refund to the SINGULAR /payments/:id/refund route', async () => {
    const urls: string[] = [];
    mockFetch(async (url) => {
      urls.push(url);
      return new Response('{}', { status: 200 });
    });
    await new MoyasarAdapter().refund('pay_1');
    expect(urls).toHaveLength(1);
    expect(urls[0]).toMatch(/\/payments\/pay_1\/refund$/);
    expect(urls[0]).not.toMatch(/\/refunds/);
  });

  it('keeps each payment id on its own URL through the shared breaker', async () => {
    // One breaker name serves many callers; the id must arrive as an argument.
    const urls: string[] = [];
    mockFetch(async (url) => {
      urls.push(url);
      return new Response(JSON.stringify({ id: 'r_1', status: 'refunded' }), { status: 200 });
    });
    const adapter = new MoyasarAdapter();
    await adapter.refund('pay_first');
    await adapter.refund('pay_second');
    expect(urls).toEqual([
      expect.stringMatching(/\/payments\/pay_first\/refund$/),
      expect.stringMatching(/\/payments\/pay_second\/refund$/),
    ]);
  });

  it('shares one breaker instance per provider+operation across adapters', async () => {
    const names: string[] = [];
    const { CircuitBreakerService } = require('../../common/circuit-breaker.service');
    const breakers = new CircuitBreakerService();
    const spy = jest.spyOn(breakers, 'create');
    mockFetch(async () => new Response('{}', { status: 200 }));
    await new StripeAdapter(breakers).verify('pi_1');
    await new StripeAdapter(breakers).verify('pi_2');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0]).toBe(spy.mock.calls[1][0]);
    expect(String(spy.mock.calls[0][0])).toMatch(/^payment:stripe:verify$/);
  });
});