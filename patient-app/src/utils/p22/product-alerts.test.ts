import {
  buildAlertBody,
  listAlertSubscriptions,
  subscribeAlert,
  unsubscribeAlert,
} from './product-alerts';

describe('P22.2 product alerts', () => {
  it('builds a restock body without a threshold', () => {
    expect(buildAlertBody({ medicine_id: 'med-1', kind: 'restock' })).toEqual({
      medicine_id: 'med-1',
      kind: 'restock',
    });
  });

  it('requires a positive threshold for price-drop alerts', () => {
    expect(buildAlertBody({ medicine_id: 'm', kind: 'price_drop', price_threshold: 42.5 })).toEqual({
      medicine_id: 'm',
      kind: 'price_drop',
      price_threshold: 42.5,
    });
    expect(() => buildAlertBody({ medicine_id: 'm', kind: 'price_drop' })).toThrow('alert_threshold_required');
    expect(() => buildAlertBody({ medicine_id: 'm', kind: 'price_drop', price_threshold: 0 })).toThrow(
      'alert_threshold_required',
    );
  });

  it('rejects empty medicine and unknown kinds', () => {
    expect(() => buildAlertBody({ medicine_id: '', kind: 'restock' })).toThrow('alert_medicine_required');
    expect(() => buildAlertBody({ medicine_id: 'm', kind: 'sale' as never })).toThrow('alert_kind_invalid');
  });

  it('subscribes via POST pharmacy/alerts/subscriptions', async () => {
    const fetch = jest.fn().mockResolvedValue({ ok: true });
    await subscribeAlert(fetch, { medicine_id: 'm', kind: 'restock' });
    const [path, init] = fetch.mock.calls[0] as [string, { method: string; body: string }];
    expect(path).toBe('/pharmacy/alerts/subscriptions');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ medicine_id: 'm', kind: 'restock' });
  });

  it('lists and unsubscribes through the contract paths', async () => {
    const fetch = jest.fn().mockResolvedValue([{ id: 'a1' }]);
    await expect(listAlertSubscriptions(fetch)).resolves.toEqual([{ id: 'a1' }]);
    expect(fetch).toHaveBeenCalledWith('/pharmacy/alerts/subscriptions');
    await unsubscribeAlert(fetch, 'a1');
    expect(fetch.mock.calls[1][0]).toBe('/pharmacy/alerts/subscriptions/a1');
    expect((fetch.mock.calls[1][1] as { method: string }).method).toBe('DELETE');
  });
});
