import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductAlertService } from './product-alert.service';

function memCollection(seed: Array<Record<string, unknown>> = []) {
  const docs: Array<Record<string, unknown>> = [...seed];
  const match = (doc: Record<string, unknown>, filter: Record<string, unknown>): boolean =>
    Object.entries(filter || {}).every(([k, cond]) => {
      const v = doc[k];
      if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
        const c = cond as Record<string, unknown>;
        if ('$eq' in c) return v === c['$eq'];
        if ('$in' in c) return (c['$in'] as unknown[]).includes(v);
        return false;
      }
      return v === cond;
    });
  return {
    docs,
    find: jest.fn().mockImplementation(async (filter: Record<string, unknown>) => ({
      toArray: jest.fn().mockResolvedValue(docs.filter((d) => match(d, filter))),
    })),
    findOne: jest.fn().mockImplementation(async (filter: Record<string, unknown>) => {
      const hit = docs.find((d) => match(d, filter));
      return hit ? { ...hit } : null;
    }),
    insertOne: jest.fn().mockImplementation(async (doc: Record<string, unknown>) => {
      docs.push({ ...doc });
      return { acknowledged: true };
    }),
    updateOne: jest.fn().mockImplementation(async (filter: Record<string, unknown>, upd: { $set?: Record<string, unknown> }) => {
      const hit = docs.find((d) => match(d, filter));
      if (!hit) return { matchedCount: 0 };
      Object.assign(hit, upd.$set || {});
      return { matchedCount: 1 };
    }),
    findOneAndUpdate: jest.fn().mockImplementation(
      async (filter: Record<string, unknown>, upd: { $set?: Record<string, unknown> }) => {
        const hit = docs.find((d) => match(d, filter));
        if (!hit) return { value: null };
        Object.assign(hit, upd.$set || {});
        return { value: { ...hit } };
      },
    ),
  };
}

describe('ProductAlertService (P22.2 subscribe→trigger→notify)', () => {
  const medA = {
    id: 'med-a',
    name_ar: 'دواء أ',
    price: 25,
    sku: 'SKU-A',
    generic_name: ' substance-a ',
  };
  const medB = { id: 'med-b', name_ar: 'دواء ب', price: 40, sku: 'SKU-B' };

  function setup() {
    const collections: Record<string, ReturnType<typeof memCollection>> = {
      medicines: memCollection([medA, medB]),
      product_alerts: memCollection([]),
    };
    const conn = { collection: jest.fn((n: string) => collections[n]) };
    const notif = {
      notifyProductRestock: jest.fn().mockResolvedValue(null),
      notifyPriceDrop: jest.fn().mockResolvedValue(null),
    };
    const service = new ProductAlertService(conn as never, notif as never);
    return { service, collections, notif };
  }

  it('subscribes and dedupes the same (user, product, kind)', async () => {
    const { service, collections } = setup();
    const a = await service.subscribe('u-1', { medicine_id: 'med-a', kind: 'restock' }, 'k-1');
    const b = await service.subscribe('u-1', { medicine_id: 'med-a', kind: 'restock' }, 'k-2');
    expect(a.id).toBe(b.id);
    expect(collections.product_alerts.docs).toHaveLength(1);
    expect(a.match_keys).toEqual(expect.arrayContaining(['med-a', 'sku-a', 'substance-a']));
  });

  it('404s on an unknown medicine (no fake success)', async () => {
    const { service } = setup();
    await expect(
      service.subscribe('u-1', { medicine_id: 'nope', kind: 'restock' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires a threshold for price_drop', async () => {
    const { service } = setup();
    await expect(
      service.subscribe('u-1', { medicine_id: 'med-a', kind: 'price_drop' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('notifies only the subscriber of the restocked product (ownership)', async () => {
    const { service, collections, notif } = setup();
    await service.subscribe('u-1', { medicine_id: 'med-a', kind: 'restock' });
    await service.subscribe('u-2', { medicine_id: 'med-b', kind: 'restock' });

    const out = await service.onRestock({ sku: 'SKU-A' });
    expect(out.notified).toBe(1);
    expect(notif.notifyProductRestock).toHaveBeenCalledTimes(1);
    expect(notif.notifyProductRestock).toHaveBeenCalledWith(
      'u-1',
      expect.objectContaining({ medicine_id: 'med-a' }),
    );

    // Parked as notified: a repeated restock event never re-notifies.
    const again = await service.onRestock({ sku: 'SKU-A' });
    expect(again.notified).toBe(0);
    expect(notif.notifyProductRestock).toHaveBeenCalledTimes(1);
    expect(collections.product_alerts.docs.find(
      (d) => d['user_id'] === 'u-2',
    )?.['status']).toBe('active');
  });

  it('matches restock by generic name as well', async () => {
    const { service, notif } = setup();
    await service.subscribe('u-1', { medicine_id: 'med-a', kind: 'restock' });
    const out = await service.onRestock({ generic_name: 'substance-a' });
    expect(out.notified).toBe(1);
    expect(notif.notifyProductRestock).toHaveBeenCalledWith(
      'u-1',
      expect.objectContaining({ medicine_id: 'med-a' }),
    );
  });

  it('fires price_drop only on a downward move through the threshold', async () => {
    const { service, notif } = setup();
    await service.subscribe('u-1', {
      medicine_id: 'med-a',
      kind: 'price_drop',
      price_threshold: 20,
    });
    // 25 → 22: downward but above threshold → silent, price tracked.
    expect((await service.reportPrice('med-a', 22, 25)).notified).toBe(0);
    expect(notif.notifyPriceDrop).not.toHaveBeenCalled();
    // 22 → 19: through the threshold → notify with old/new prices.
    expect((await service.reportPrice('med-a', 19)).notified).toBe(1);
    expect(notif.notifyPriceDrop).toHaveBeenCalledWith(
      'u-1',
      expect.objectContaining({ old_price: 22, new_price: 19 }),
    );
    // Upward moves never notify.
    await service.subscribe('u-2', {
      medicine_id: 'med-b',
      kind: 'price_drop',
      price_threshold: 100,
    });
    expect((await service.reportPrice('med-b', 45, 40)).notified).toBe(0);
    expect(notif.notifyPriceDrop).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe is owner-scoped', async () => {
    const { service } = setup();
    const sub = await service.subscribe('u-1', { medicine_id: 'med-a', kind: 'restock' });
    await expect(service.unsubscribe('u-2', sub.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.unsubscribe('u-1', sub.id)).resolves.toEqual({ ok: true });
  });
});

describe('PharmacyInventoryExtService.restock → patient alert edge (P22.2)', () => {
  it('fires onRestock on the 0 → positive edge only', async () => {
    const { PharmacyInventoryExtService } = await import(
      './pharmacy-inventory-ext.service'
    );
    const inv = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    const alerts = { updateMany: jest.fn().mockResolvedValue({}) };
    const productAlerts = { onRestock: jest.fn().mockResolvedValue({ notified: 1 }) };
    const svc = new PharmacyInventoryExtService(
      inv as never,
      alerts as never,
      productAlerts as never,
    );
    const user = { id: 'ph-1', role: 'pharmacy' };

    // 0 → 5: fires with the inventory sku.
    inv.findOne.mockResolvedValue({ stock: 0 });
    inv.findOneAndUpdate.mockResolvedValue({
      stock: 5,
      min_stock_alert: 2,
      sku: 'SKU-A',
      generic_name: 'substance-a',
      toObject: () => ({ stock: 5 }),
    });
    await svc.restock(user, 'item-1', 5);
    expect(productAlerts.onRestock).toHaveBeenCalledWith({
      sku: 'SKU-A',
      generic_name: 'substance-a',
    });

    // 5 → 9: no edge, no alert.
    productAlerts.onRestock.mockClear();
    inv.findOne.mockResolvedValue({ stock: 5 });
    inv.findOneAndUpdate.mockResolvedValue({
      stock: 9,
      min_stock_alert: 2,
      sku: 'SKU-A',
      toObject: () => ({ stock: 9 }),
    });
    await svc.restock(user, 'item-1', 4);
    expect(productAlerts.onRestock).not.toHaveBeenCalled();
  });
});
