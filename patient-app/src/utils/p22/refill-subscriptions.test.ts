import {
  buildSubscribeBody,
  canProduceRefill,
  cancelRefillSubscription,
  daysUntilRefill,
  isRxValid,
  listRefillSubscriptions,
  subscribeRefill,
  type RefillSubscription,
} from './refill-subscriptions';

describe('P22.1 refill subscriptions', () => {
  it('builds a valid subscribe body', () => {
    expect(
      buildSubscribeBody({ items: [{ medicine_id: 'med-1', qty: 2 }], cadence_days: 30 }),
    ).toEqual({ items: [{ medicine_id: 'med-1', qty: 2 }], cadence_days: 30 });
  });

  it('rejects empty items, bad qty, and out-of-range cadence', () => {
    expect(() => buildSubscribeBody({ items: [], cadence_days: 30 })).toThrow('refill_items_required');
    expect(() => buildSubscribeBody({ items: [{ medicine_id: 'm', qty: 0 }], cadence_days: 30 })).toThrow(
      'refill_qty_invalid',
    );
    expect(() => buildSubscribeBody({ items: [{ medicine_id: 'm', qty: 1 }], cadence_days: 3 })).toThrow(
      'refill_cadence_invalid',
    );
    expect(() => buildSubscribeBody({ items: [{ medicine_id: 'm', qty: 1 }], cadence_days: 200 })).toThrow(
      'refill_cadence_invalid',
    );
  });

  it('blocks refills on an expired prescription', () => {
    const now = new Date('2026-10-06T00:00:00Z');
    expect(isRxValid({ prescription_valid_until: '2026-10-01T00:00:00Z' }, now)).toBe(false);
    expect(isRxValid({ prescription_valid_until: '2026-12-01T00:00:00Z' }, now)).toBe(true);
    expect(isRxValid({}, now)).toBe(true);
  });

  it('counts days until refill without fabricating dates', () => {
    const now = new Date('2026-10-06T00:00:00Z');
    expect(daysUntilRefill({ next_refill_at: '2026-10-09T00:00:00Z' }, now)).toBe(3);
    expect(daysUntilRefill({}, now)).toBeNull();
  });

  it('only active + Rx-valid subscriptions can produce refills', () => {
    const now = new Date('2026-10-06T00:00:00Z');
    const base: RefillSubscription = {
      id: 's1',
      items: [{ medicine_id: 'm', qty: 1 }],
      cadence_days: 30,
      status: 'active',
    };
    expect(canProduceRefill(base, now)).toBe(true);
    expect(canProduceRefill({ ...base, status: 'cancelled' }, now)).toBe(false);
    expect(canProduceRefill({ ...base, prescription_valid_until: '2026-09-01T00:00:00Z' }, now)).toBe(false);
  });

  it('lists via GET pharmacy/refills/subscriptions', async () => {
    const fetch = jest.fn().mockResolvedValue([{ id: 's1' }]);
    await expect(listRefillSubscriptions(fetch)).resolves.toEqual([{ id: 's1' }]);
    expect(fetch).toHaveBeenCalledWith('/pharmacy/refills/subscriptions');
  });

  it('subscribes via POST with the guarded body', async () => {
    const fetch = jest.fn().mockResolvedValue({ ok: true });
    await subscribeRefill(fetch, { items: [{ medicine_id: 'm', qty: 1 }], cadence_days: 30 });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [path, init] = fetch.mock.calls[0] as [string, { method: string; body: string }];
    expect(path).toBe('/pharmacy/refills/subscriptions');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ items: [{ medicine_id: 'm', qty: 1 }], cadence_days: 30 });
  });

  it('cancels via POST subscriptions/:id/cancel', async () => {
    const fetch = jest.fn().mockResolvedValue({ ok: true });
    await cancelRefillSubscription(fetch, 's1');
    expect(fetch.mock.calls[0][0]).toBe('/pharmacy/refills/subscriptions/s1/cancel');
  });
});
