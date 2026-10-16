import { ConflictException } from '@nestjs/common';
import { PharmacyAllocationService } from './services/pharmacy-allocation.service';
import { PharmacyChatService } from './services/pharmacy-chat.service';
import { AllocationItemAction, PharmacyAllocationState } from './schemas/pharmacy.schema';

// Owner decision 30 made the order chat reachable. Once an order is paid, the paid amount is bound to the quote
// (pharmacy_payment_evidence.quote_snapshot_hash): a substitute that changes the line's price, or a removed line, would
// neither be charged nor refunded and the order could not be fulfilled. Both are refused after payment.
describe('substitutes and removed lines after payment', () => {
  const PAT = { id: 'pat-1', role: 'patient' };

  function setup(opts: { paid: boolean; subPrice: number }) {
    const item = {
      id: 'ai-1', order_item_id: 'oi-1', action: AllocationItemAction.AVAILABLE, inventory_id: 'inv-orig', sku: 'ORIG', name: 'Orig',
      qty_requested: 2, qty_offered: 2, unit_price: 10, updated_at: new Date(),
      substitute_status: 'proposed', substitute_proposal: { sku: 'SUB-1', qty_offered: 2, reason: 'out of stock' },
    };
    const alloc: any = {
      id: 'alloc-1', order_id: 'o-1', pharmacy_account_id: 'ph-1', offer_id: 'of-1', offer_version: 1,
      status: PharmacyAllocationState.PENDING_REVIEW, items: [item],
      totals: { subtotal: 20, delivery_fee: 5, total: 25, currency: 'SAR' }, timeline: [],
      markModified: jest.fn(), save: jest.fn(async function (this: any) { return this; }),
    };
    const evidence = opts.paid ? { order_id: 'o-1', status: 'confirmed', amount: 25 } : null;
    const db = { collection: jest.fn((name: string) => ({ findOne: jest.fn(async () => (name === 'pharmacy_payment_evidence' ? evidence : null)) })) };
    const orders: any = {
      findOne: jest.fn(async () => ({ id: 'o-1', patient_account_id: 'pat-1', items: [{ id: 'oi-1' }] })),
      updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
      db,
    };
    const sub = { id: 'inv-sub-1', sku: 'SUB-1', name_ar: 'بديل', price: opts.subPrice, stock: 100, available: true };
    const inv = { findOne: jest.fn(async () => sub), findOneAndUpdate: jest.fn(async () => sub), updateOne: jest.fn(async () => ({ modifiedCount: 1 })) };
    const split = { holdsStock: jest.fn(async () => false) };
    const notif = { notifyPharmacySubstituteDecided: jest.fn(async () => null) };
    const bus = { emit: jest.fn(async () => null) };
    const allocs = { findOne: jest.fn(async () => alloc) };
    const svc = new PharmacyAllocationService(allocs as any, orders as any, inv as any, split as any, notif as any, bus as any, { transition: jest.fn() } as any);
    return { svc, alloc, orders, allocs, bus };
  }

  it('a paid order refuses a substitute that changes what the line costs, and changes nothing', async () => {
    const { svc, alloc, orders } = setup({ paid: true, subPrice: 15 });
    await expect(svc.decideSubstitute(PAT, 'alloc-1', 'ai-1', 'accepted')).rejects.toThrow(ConflictException);
    await expect(svc.decideSubstitute(PAT, 'alloc-1', 'ai-1', 'accepted')).rejects.toThrow('substitute_price_after_payment');
    expect(alloc.items[0].sku).toBe('ORIG');
    expect(alloc.totals.total).toBe(25);
    expect(orders.updateOne).not.toHaveBeenCalled();
  });

  it('a paid order accepts a substitute at the same price', async () => {
    const { svc, alloc } = setup({ paid: true, subPrice: 10 });
    await svc.decideSubstitute(PAT, 'alloc-1', 'ai-1', 'accepted');
    expect(alloc.items[0]).toMatchObject({ sku: 'SUB-1', substitute_status: 'accepted', unit_price: 10 });
    expect(alloc.totals.total).toBe(25);
  });

  it('an unpaid order takes the substitute at its price (the patient pays the new total)', async () => {
    const { svc, alloc } = setup({ paid: false, subPrice: 15 });
    await svc.decideSubstitute(PAT, 'alloc-1', 'ai-1', 'accepted');
    expect(alloc.totals).toMatchObject({ subtotal: 30, total: 35 });
  });

  it('a chat accept refused after payment leaves the line as it was (fulfilment never waits on it)', async () => {
    const { svc, alloc } = setup({ paid: true, subPrice: 15 });
    alloc.items[0].substitute_status = undefined;
    alloc.items[0].substitute_proposal = undefined;
    await expect(svc.acceptChatSubstitute(PAT, 'o-1', 'ph-1', 'oi-1', { sku: 'SUB-1' })).rejects.toThrow('substitute_price_after_payment');
    expect(alloc.items[0].substitute_status).toBeUndefined();
    expect(alloc.items[0].substitute_proposal).toBeUndefined();
    expect(alloc.items[0].sku).toBe('ORIG');
  });

  it('the chat refuses to remove a line of a paid order, and leaves the thread open', async () => {
    const { orders, allocs, bus } = setup({ paid: true, subPrice: 10 });
    const thread: any = { id: 't-1', order_id: 'o-1', order_item_id: 'oi-1', patient_account_id: 'pat-1', pharmacy_account_id: 'ph-1', status: 'open', save: jest.fn() };
    const threads = { findOne: jest.fn(async () => thread) };
    const messages = { create: jest.fn() };
    const chat = new PharmacyChatService(threads as any, messages as any, orders, allocs as any, bus as any, {} as never);
    await expect(chat.rejectOrRemove(PAT, 't-1', 'removed')).rejects.toThrow('item_removal_after_payment');
    expect(thread.status).toBe('open');
    expect(thread.save).not.toHaveBeenCalled();
    expect(messages.create).not.toHaveBeenCalled();
  });
});
