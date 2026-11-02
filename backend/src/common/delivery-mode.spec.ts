import { deliveryFeeLineKey, deliveryModeOf, platformVatOf } from './tax-registration';

describe('deliveryModeOf', () => {
  it('reads order.delivery_mode, then fulfillment.delivery_mode; anything else (and nothing) is the platform', () => {
    expect(deliveryModeOf({ delivery_mode: 'pharmacy_own' })).toBe('pharmacy_own');
    expect(deliveryModeOf({ fulfillment: { delivery_mode: 'pharmacy_own' } })).toBe('pharmacy_own');
    expect(deliveryModeOf({ delivery_mode: 'platform', fulfillment: { delivery_mode: 'pharmacy_own' } })).toBe('platform');
    expect(deliveryModeOf(null, undefined, { delivery_mode: 'pharmacy_own' })).toBe('pharmacy_own');
    expect(deliveryModeOf({ delivery_mode: 'courier' }, { fulfillment: 'delivery' })).toBe('platform');
    expect(deliveryModeOf()).toBe('platform');
  });
  it('only the platform\'s fee line carries platform VAT', () => {
    const lines = (mode: 'platform' | 'pharmacy_own') => [{ key: deliveryFeeLineKey(mode), amount: 15 }];
    expect(platformVatOf(lines('platform'), 0.15, 115)).toBe(1.96);
    expect(platformVatOf(lines('pharmacy_own'), 0.15, 115)).toBe(0);
  });
});
