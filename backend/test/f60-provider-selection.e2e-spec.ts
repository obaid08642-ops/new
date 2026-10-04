/**
 * F60 + Q104 — one payment processor. Moyasar is the only gateway (owner
 * decision 2026-10-04: one payment system, the one the patient app and web use
 * with Moyasar). Stripe and Tap adapters were removed; asking for them fails
 * loudly, and no key means fail-closed, never a silent fallback.
 */
import { DisabledGatewayAdapter, isProviderConfigured, selectGateway } from '../src/modules/payments/payment-gateway';

class FakeGateway {
  constructor(readonly name: string) {}
  async createIntent(): Promise<any> { return { intent_id: 'i' }; }
  async verify(): Promise<any> { return { status: 'pending' as const }; }
  async refund(): Promise<any> { return { refunded: true }; }
}

const factories: any = { moyasar: () => new FakeGateway('moyasar') };

describe('F60 — Moyasar is the only payment gateway', () => {
  const original = { ...process.env };
  beforeEach(() => {
    delete process.env.PAYMENT_PROVIDER;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.TAP_API_KEY;
    delete process.env.MOYASAR_API_KEY;
  });
  afterAll(() => { process.env = { ...original }; });

  it('selects Moyasar when its key is set, whatever other keys exist', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_x';
    process.env.TAP_API_KEY = 'sk_test_x';
    process.env.MOYASAR_API_KEY = 'sk_test_x';
    expect(selectGateway(factories).name).toBe('moyasar');
    process.env.PAYMENT_PROVIDER = 'moyasar';
    expect(selectGateway(factories).name).toBe('moyasar');
  });

  it('rejects stripe, tap or any other PAYMENT_PROVIDER value', () => {
    for (const p of ['stripe', 'tap', 'hyperpay', 'paypal']) {
      process.env.PAYMENT_PROVIDER = p;
      expect(() => selectGateway(factories)).toThrow(/payment_provider_unknown/);
    }
  });

  it('refuses PAYMENT_PROVIDER=moyasar without its key, and does not fall back', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_x';
    process.env.PAYMENT_PROVIDER = 'moyasar';
    expect(() => selectGateway(factories)).toThrow(/payment_gateway_not_configured/);
  });

  it('is fail-closed without a Moyasar key, even when Stripe or Tap keys are present', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_x';
    process.env.TAP_API_KEY = 'sk_test_x';
    expect(selectGateway(factories)).toBeInstanceOf(DisabledGatewayAdapter);
  });

  it('every gateway method throws 503 when disabled, never a fake success', async () => {
    const g = new DisabledGatewayAdapter();
    await expect(g.createIntent()).rejects.toThrow(/payment_gateway_not_configured/);
    await expect(g.verify()).rejects.toThrow(/payment_gateway_not_configured/);
    await expect(g.refund()).rejects.toThrow(/payment_gateway_not_configured/);
  });

  it('isProviderConfigured is true only for Moyasar with its key', () => {
    expect(isProviderConfigured('disabled')).toBe(false);
    expect(isProviderConfigured('moyasar')).toBe(false);
    process.env.MOYASAR_API_KEY = 'sk_test_x';
    expect(isProviderConfigured('moyasar')).toBe(true);
  });
});
