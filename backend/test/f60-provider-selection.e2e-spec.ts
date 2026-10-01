/**
 * F60 (plan item) — the active payment processor is chosen by PAYMENT_PROVIDER.
 *
 * Before this, selectAdapter() returned whichever adapter matched the first
 * API key it found (STRIPE_SECRET_KEY beat TAP_API_KEY beat MOYASAR_API_KEY).
 * A deployment carrying two keys therefore charged through a processor nobody
 * chose, and no configuration recorded the intent. These tests pin the new rule,
 * including the two cases that must never silently fall back.
 */
import { DisabledGatewayAdapter, isProviderConfigured, selectGateway } from '../src/modules/payments/payment-gateway';

class FakeGateway {
  constructor(readonly name: string) {}
  async createIntent(): Promise<any> { return { intent_id: 'i' }; }
  async verify(): Promise<any> { return { status: 'pending' as const }; }
  async refund(): Promise<any> { return { refunded: true }; }
}

const factories: any = {
  stripe: () => new FakeGateway('stripe'),
  tap: () => new FakeGateway('tap'),
  moyasar: () => new FakeGateway('moyasar'),
};

describe('F60 — PAYMENT_PROVIDER selects the gateway', () => {
  const original = { ...process.env };
  beforeEach(() => {
    delete process.env.PAYMENT_PROVIDER;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.TAP_API_KEY;
    delete process.env.MOYASAR_API_KEY;
  });
  afterAll(() => { process.env = { ...original }; });

  it('honours PAYMENT_PROVIDER=moyasar even when a Stripe key is also present', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_x';
    process.env.MOYASAR_API_KEY = 'sk_test_x';
    process.env.PAYMENT_PROVIDER = 'moyasar';
    expect(selectGateway(factories).name).toBe('moyasar');
  });

  it('honours PAYMENT_PROVIDER=tap when several keys are set', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_x';
    process.env.TAP_API_KEY = 'sk_test_x';
    process.env.PAYMENT_PROVIDER = 'tap';
    expect(selectGateway(factories).name).toBe('tap');
  });

  it('refuses an explicitly requested provider whose key is missing, and does not fall back', () => {
    process.env.MOYASAR_API_KEY = 'sk_test_x';
    process.env.PAYMENT_PROVIDER = 'tap';
    expect(() => selectGateway(factories)).toThrow(/payment_gateway_not_configured/);
  });

  it('rejects an unknown PAYMENT_PROVIDER value', () => {
    process.env.PAYMENT_PROVIDER = 'paypal';
    expect(() => selectGateway(factories)).toThrow(/payment_provider_unknown/);
  });

  it('rejects a provider that is configured but has no adapter', () => {
    process.env.HYPERPAY_API_KEY = 'hp_x';
    process.env.PAYMENT_PROVIDER = 'hyperpay';
    expect(() => selectGateway(factories)).toThrow(/payment_provider_not_implemented/);
  });

  it('falls back to the first configured provider when PAYMENT_PROVIDER is unset', () => {
    process.env.MOYASAR_API_KEY = 'sk_test_x';
    expect(selectGateway(factories).name).toBe('moyasar');
  });

  it('is fail-closed with no keys at all', () => {
    expect(selectGateway(factories)).toBeInstanceOf(DisabledGatewayAdapter);
  });

  it('every gateway method throws 503 when disabled, never a fake success', async () => {
    const g = new DisabledGatewayAdapter();
    await expect(g.createIntent()).rejects.toThrow(/payment_gateway_not_configured/);
    await expect(g.verify()).rejects.toThrow(/payment_gateway_not_configured/);
    await expect(g.refund()).rejects.toThrow(/payment_gateway_not_configured/);
  });

  it('isProviderConfigured is false for disabled and true only with the key', () => {
    expect(isProviderConfigured('disabled')).toBe(false);
    expect(isProviderConfigured('tap')).toBe(false);
    process.env.TAP_API_KEY = 'sk_test_x';
    expect(isProviderConfigured('tap')).toBe(true);
  });
});
