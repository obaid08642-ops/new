import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PharmacyOfferService } from '../services/pharmacy-offer.service';

const lean = (value: any) => ({ lean: jest.fn().mockResolvedValue(value) });

describe('PharmacyOfferService', () => {
  const order = {
    id: 'order-1', patient_account_id: 'patient-1', status: 'broadcasting',
    items: [{ id: 'item-1', matched_sku: 'SKU-1', qty: 2, name_ar: 'دواء', generic_name: 'generic-1' }],
  };
  const broadcast = { id: 'broadcast-1', order_id: 'order-1', notified_pharmacies: ['pharmacy-1'], lock_state: 'open' };
  const inventoryItem = { id: 'inventory-1', provider_account_id: 'pharmacy-1', sku: 'SKU-1', name_ar: 'دواء', stock: 9, available: true, price: 17.5, currency: 'SAR', updatedAt: new Date() };

  function service(overrides: Record<string, any> = {}) {
    const accounts = overrides.accounts || { findOne: jest.fn(() => lean({ id: 'pharmacy-1', provider_type: 'pharmacy', status: 'approved' })) };
    const broadcasts = overrides.broadcasts || { findOne: jest.fn(() => lean(broadcast)) };
    const orders = overrides.orders || { findOne: jest.fn(() => lean(order)) };
    const inventory = overrides.inventory || { findOne: jest.fn(() => lean(inventoryItem)) };
    const offers = overrides.offers || {
      findOne: jest.fn(() => lean(null)),
      create: jest.fn(async (value) => ({ ...value, toObject: () => value })),
    };
    const allocations = overrides.allocations || {};
    const connection = overrides.connection || { startSession: jest.fn() };
    const bus = { emit: jest.fn().mockResolvedValue(undefined) };
    return new PharmacyOfferService(connection as any, offers as any, orders as any, allocations as any, broadcasts as any, inventory as any, accounts as any, bus as any);
  }

  it('derives item price and total from pharmacy inventory rather than client input', async () => {
    const offers = { findOne: jest.fn(() => lean(null)), create: jest.fn(async (value) => ({ ...value, toObject: () => value })) };
    const svc = service({ offers });
    const result = await svc.upsertDraft(
      { id: 'pharmacy-1', role: 'provider' }, 'order-1',
      { items: [{ order_item_id: 'item-1', availability: 'available', inventory_item_id: 'inventory-1', unit_price: 0, total: 0 } as any] },
    );
    expect(result.totals).toEqual({ subtotal: 35, delivery_fee: 0, total: 35, currency: 'SAR' });
    expect(result.items[0].unit_price).toBe(17.5);
    expect(result.status).toBe('draft');
  });

  it('returns a server-derived preview with explicit read-only delivery policy and ignores client ETA', async () => {
    const svc = service();
    const result = await svc.previewQuote(
      { id: 'pharmacy-1', role: 'provider' }, 'order-1',
      { items: [{ order_item_id: 'item-1', availability: 'available', inventory_item_id: 'inventory-1', qty_offered: 1 }], delivery_option: 'delivery', eta_minutes: 1 },
    );
    expect(result.totals).toEqual({ subtotal: 17.5, delivery_fee: 0, total: 17.5, currency: 'SAR' });
    expect(result.quote_ttl_seconds).toBe(600);
    expect(result.fulfillment).toEqual(expect.objectContaining({ policy_status: 'unavailable_read_only', delivery_option: null, eta_minutes: null }));
    expect(result.delivery_client_fields_ignored).toBe(true);
  });

  it('rejects a pharmacy that was not notified for the broadcast', async () => {
    const svc = service({ broadcasts: { findOne: jest.fn(() => lean({ ...broadcast, notified_pharmacies: ['other-pharmacy'] })) } });
    await expect(svc.upsertDraft({ id: 'pharmacy-1', role: 'provider' }, 'order-1', { items: [] }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects patient offer selection with no valid idempotency key before reserving stock', async () => {
    const connection = { startSession: jest.fn() };
    const svc = service({ connection });
    await expect(svc.selectByPatient({ id: 'patient-1', role: 'patient' }, 'order-1', 'offer-1', 'short'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(connection.startSession).not.toHaveBeenCalled();
  });

  it('keeps unavailable items in the quote with an explicit zero contribution', async () => {
    const twoItemOrder = {
      ...order,
      items: [
        { id: 'item-1', matched_sku: 'SKU-1', qty: 2, name_ar: 'دواء متاح', generic_name: 'generic-1' },
        { id: 'item-2', matched_sku: 'SKU-2', qty: 1, name_ar: 'دواء غير متاح', generic_name: 'generic-2' },
      ],
    };
    const inventory = {
      findOne: jest.fn(({ id }: any) => lean(id === 'inventory-1' ? inventoryItem : null)),
    };
    const svc = service({ orders: { findOne: jest.fn(() => lean(twoItemOrder)) }, inventory });
    const result = await svc.previewQuote(
      { id: 'pharmacy-1', role: 'provider' }, 'order-1',
      { items: [
        { order_item_id: 'item-1', availability: 'available', inventory_item_id: 'inventory-1' },
        { order_item_id: 'item-2', availability: 'unavailable' },
      ] },
    );
    expect(result.items.map((item: any) => item.action)).toEqual(['available', 'unavailable']);
    expect(result.totals).toEqual({ subtotal: 35, delivery_fee: 0, total: 35, currency: 'SAR' });
  });

  it('writes an audit row for an order-level provider price override', async () => {
    const submittedOffer = {
      id: 'offer-1', order_id: 'order-1', patient_account_id: 'patient-1', version: 1,
      items: [{ order_item_id: 'item-1', sku: 'SKU-1', name_ar: 'دواء', unit_price: 20, catalog_price: 17.5, price_source: 'provider_override', price_override_reason: 'تحديث سعر الفرع', currency: 'SAR' }],
      toObject() { return this; },
    };
    const audit = { insertMany: jest.fn().mockResolvedValue({ acknowledged: true }) };
    const connection = { collection: jest.fn(() => audit) };
    const offers: any = {
      findOne: jest.fn(() => lean(null)),
      findOneAndUpdate: jest.fn(async () => submittedOffer),
    };
    const svc = service({ connection, offers });
    await svc.submitDraft({ id: 'pharmacy-1', role: 'provider' }, 'order-1', 'offer-1');
    expect(audit.insertMany).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ order_id: 'order-1', offer_id: 'offer-1', catalog_price: 17.5, override_price: 20, changed_by: 'pharmacy-1' }),
    ]));
  });
});
