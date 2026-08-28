import { refillTrackingParams } from './chronic-refill-contract';

describe('chronic refill tracking contract', () => {
  it('opens tracking only with the actual order identity created by the server', () => {
    expect(refillTrackingParams({ ok: true, order_id: 'order-42', state: 'CREATED' })).toEqual({ orderId: 'order-42' });
  });

  it('does not fabricate a tracking id from an incomplete or failed refill response', () => {
    expect(refillTrackingParams({ ok: true })).toBeNull();
    expect(refillTrackingParams({ ok: false, order_id: 'order-42' })).toBeNull();
    expect(refillTrackingParams(null)).toBeNull();
  });
});
