import { marketClientConfig } from './market-client-config';
import { MarketConfigController } from './market-config.controller';
import { runWithMarketContext } from './market-context';
import { SA_CONFIG_V1 } from './sa-market.seed';
import { MarketsService } from './markets.service';

const ctx = { market_id: 'SA', country: 'SA', operator_id: 'op-sa-default', currency: 'SAR', timezone: 'Asia/Riyadh', config_version: 1, source: 'default' as const, config: SA_CONFIG_V1 };

describe('marketClientConfig (SA)', () => {
  const c = marketClientConfig(ctx);
  it('is exactly what the Saudi clients hold as constants today', () => {
    expect(c.currency).toEqual({ code: 'SAR', exponent: 2 });
    expect(c.timezone).toBe('Asia/Riyadh');
    expect(c.phone.default_dial).toBe('+966');
    expect(c.emergency_numbers.ambulance).toBe('997');
    expect(c.weekend).toEqual(['friday', 'saturday']);
    expect(c.locales.enabled).toEqual(['ar', 'en', 'ur', 'hi', 'bn', 'fil']);
    expect(c.address_template.id).toBe('sa-short-address');
    expect(c.operated_by).toBeNull();
  });
  it('does not leak internal fields (operator id, tax scheme, gateway)', () => {
    const json = JSON.stringify(c);
    for (const k of ['operator_id', 'tax', 'vat', 'gateway', 'scheme', 'op-sa-default']) expect(json).not.toContain(k);
  });
  it('shows "operated by" text from the market config only', () => {
    const withPartner = { ...ctx, config: { ...SA_CONFIG_V1, branding: { operated_by: 'Example Partner' } } };
    expect(marketClientConfig(withPartner).operated_by).toBe('Example Partner');
  });
  it('an unregistered market has no address template: it throws, never a Saudi one', () => {
    expect(() => marketClientConfig({ ...ctx, market_id: 'ZZ9' })).toThrow('plugin_not_found');
  });
});

describe('GET /config/market', () => {
  const svc = { getMarket: jest.fn(async () => ({ id: 'SA', country: 'SA', operator_id: 'op-sa-default', status: 'live' })), getConfig: jest.fn(async () => ({ market_id: 'SA', version: 1, config: SA_CONFIG_V1 })) };
  const ctrl = new MarketConfigController(svc as unknown as MarketsService);
  it('serves the request context when the middleware set one', async () => {
    const r = await runWithMarketContext({ ...ctx, config_version: 7 }, () => ctrl.get());
    expect(r.config_version).toBe(7);
    expect(svc.getMarket).not.toHaveBeenCalled();
  });
  it('falls back to the launch market when there is no context', async () => {
    const r = await ctrl.get();
    expect(r.market_id).toBe('SA');
    expect(r.currency.code).toBe('SAR');
  });
  it('is 503 when the launch market cannot be read', async () => {
    const down = new MarketConfigController({ getMarket: async () => { throw new Error('db'); }, getConfig: async () => { throw new Error('db'); } } as unknown as MarketsService);
    await expect(down.get()).rejects.toThrow('market_config_unavailable');
  });
});
