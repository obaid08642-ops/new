import { ForbiddenException } from '@nestjs/common';
import {
  PharmacyAllocationService,
} from './services/pharmacy-allocation.service';
import { PharmacyChatService } from './services/pharmacy-chat.service';
import {
  AllocationItemAction,
  PharmacyAllocationState,
} from './schemas/pharmacy.schema';

// P13-R2: item-level substitution is a patient decision, never automatic.
// Red on the base: allocation itemAction(SUBSTITUTE) swaps sku/totals at once,
// there is no patient accept/reject on the allocation, and chat accept does
// not recalculate totals.
describe('P13-R2 substitute requires patient consent', () => {
  const SUB = {
    id: 'inv-sub-1', sku: 'SUB-1', name_ar: 'بديل', name_en: 'Sub',
    price: 15, stock: 100, available: true,
  };

  function makeItem(over: any = {}) {
    return {
      id: 'ai-1', order_item_id: 'oi-1', action: AllocationItemAction.AVAILABLE,
      inventory_id: 'inv-orig', sku: 'ORIG', name: 'Orig',
      qty_requested: 2, qty_offered: 2, unit_price: 10,
      updated_at: new Date(), ...over,
    };
  }

  function makeAlloc(items: any[] = [makeItem()], over: any = {}) {
    return {
      id: 'alloc-1', order_id: 'o-1', pharmacy_account_id: 'ph-1',
      offer_id: 'of-1', offer_version: 1,
      status: PharmacyAllocationState.PENDING_REVIEW,
      items,
      totals: { subtotal: 20, delivery_fee: 5, total: 25, currency: 'SAR' },
      timeline: [],
      markModified: jest.fn(), save: jest.fn(async function (this: any) { return this; }),
      toObject: function (this: any) { return { ...this }; },
      ...over,
    };
  }

  function makeAllocSvc(alloc: any) {
    const allocs = { findOne: jest.fn(async () => alloc), find: jest.fn(() => ({ lean: async () => [alloc] })) };
    const orders = {
      findOne: jest.fn(async () => ({ id: 'o-1', patient_account_id: 'pat-1', status: 'cash_card_payment_pending' })),
      updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
      db: { collection: jest.fn(() => ({ findOne: jest.fn(async () => null) })) },
    };
    const inv = {
      findOne: jest.fn(async () => SUB),
      findOneAndUpdate: jest.fn(async () => SUB),
      updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
    };
    const split = { holdsStock: jest.fn(async () => false), releaseStockForAllocation: jest.fn(async () => null) };
    const notif = {
      notifyPatientSubstituteProposed: jest.fn(async () => null),
      notifyPharmacySubstituteDecided: jest.fn(async () => null),
      notifyPatientItemUnavailable: jest.fn(async () => null),
      notifyPatientAllocationConfirmed: jest.fn(async () => null),
      notifyPatientAllocationProgress: jest.fn(async () => null),
    };
    const bus = { emit: jest.fn(async () => null) };
    const engine = { transition: jest.fn(async () => true) };
    const svc = new PharmacyAllocationService(allocs as any, orders as any, inv as any, split as any, notif as any, bus as any, engine as any);
    return { svc, allocs, orders, inv, split, notif, bus, engine, alloc };
  }

  const PHARM = { id: 'ph-1', role: 'pharmacy' };
  const PAT = { id: 'pat-1', role: 'patient' };

  it('provider SUBSTITUTE only proposes: sku and totals stay until the patient decides', async () => {
    // Composition allocations carry no offer binding yet (post-selection
    // lines are immutable and change only through the patient paths below).
    const compAlloc = makeAlloc();
    delete (compAlloc as any).offer_id;
    const { svc, notif, alloc } = makeAllocSvc(compAlloc);
    await svc.itemAction(PHARM, 'alloc-1', 'ai-1', {
      action: AllocationItemAction.SUBSTITUTE, substitute_sku: 'SUB-1', substitute_reason: 'out of stock',
    } as any);
    const item = alloc.items[0];
    expect(item.sku).toBe('ORIG');
    expect(item.substitute_status).toBe('proposed');
    expect(item.substitute_proposal).toMatchObject({ sku: 'SUB-1', unit_price: 15 });
    expect(alloc.totals).toMatchObject({ subtotal: 20, total: 25 });
    expect(notif.notifyPatientSubstituteProposed).toHaveBeenCalled();
  });

  it('patient accept applies the swap and updates the order total', async () => {
    const item = makeItem({ substitute_status: 'proposed', substitute_proposal: { sku: 'SUB-1', name: 'Sub', unit_price: 15, qty_offered: 2, reason: 'out of stock' } });
    const { svc, orders, notif, alloc } = makeAllocSvc(makeAlloc([item]));
    await (svc as any).decideSubstitute(PAT, 'alloc-1', 'ai-1', 'accepted');
    expect(alloc.items[0].sku).toBe('SUB-1');
    expect(alloc.items[0].substitute_status).toBe('accepted');
    expect(alloc.totals).toMatchObject({ subtotal: 30, total: 35 });
    expect(orders.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'o-1' }),
      expect.objectContaining({ $set: expect.objectContaining({ totals: expect.objectContaining({ total: 35 }) }) }),
    );
    expect(notif.notifyPharmacySubstituteDecided).toHaveBeenCalled();
  });

  it('patient reject removes the item and updates the order total', async () => {
    const item = makeItem({ substitute_status: 'proposed', substitute_proposal: { sku: 'SUB-1', name: 'Sub', unit_price: 15, qty_offered: 2, reason: 'out of stock' } });
    const { svc, alloc } = makeAllocSvc(makeAlloc([item]));
    await (svc as any).decideSubstitute(PAT, 'alloc-1', 'ai-1', 'rejected');
    expect(alloc.items[0].action).toBe(AllocationItemAction.UNAVAILABLE);
    expect(alloc.items[0].qty_offered).toBe(0);
    expect(alloc.items[0].substitute_status).toBe('rejected');
    expect(alloc.totals).toMatchObject({ subtotal: 0, total: 5 });
  });

  it('a stranger cannot decide another patient’s substitute', async () => {
    const item = makeItem({ substitute_status: 'proposed', substitute_proposal: { sku: 'SUB-1', unit_price: 15, qty_offered: 2 } });
    const { svc } = makeAllocSvc(makeAlloc([item]));
    await expect((svc as any).decideSubstitute({ id: 'other', role: 'patient' }, 'alloc-1', 'ai-1', 'accepted'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fulfilment is blocked while a substitute proposal is pending', async () => {
    const item = makeItem({ substitute_status: 'proposed', substitute_proposal: { sku: 'SUB-1', unit_price: 15, qty_offered: 2 } });
    const { svc, alloc } = makeAllocSvc(makeAlloc([item]));
    jest.spyOn(svc as any, 'assertFulfillmentAuthorized').mockResolvedValue({ id: 'o-1' });
    await expect(svc.confirm(PHARM, 'alloc-1')).rejects.toThrow('substitute_acceptance_required');
    expect(alloc.save).not.toHaveBeenCalled();
  });

  it('chat accept recalculates the allocation total', async () => {
    const alloc = makeAlloc();
    const threads = { findOne: jest.fn(async () => ({ id: 't-1', order_id: 'o-1', order_item_id: 'oi-1', patient_account_id: 'pat-1', pharmacy_account_id: 'ph-1', status: 'open', save: jest.fn(async () => null) })) };
    const messages = {
      findOne: jest.fn(() => ({ lean: async () => ({ id: 'm-1', substitute_offer: { sku: 'SUB-1', name: 'Sub', price: 15 } }) })),
      create: jest.fn(async (m: any) => m),
    };
    const orders = {
      findOne: jest.fn(async () => null),
      updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
    };
    const allocs = { findOne: jest.fn(async () => alloc) };
    const bus = { emit: jest.fn(async () => null) };
    // owner decision 30: the chat accept goes through the allocation's own accept (stock, prescription, paid price)
    const allocation = makeAllocSvc(alloc);
    const chat = new PharmacyChatService(threads as any, messages as any, orders as any, allocs as any, bus as any, allocation.svc);
    await chat.acceptSubstitute({ id: 'pat-1', role: 'patient' } as any, 't-1', 'm-1');
    expect(alloc.items[0].substitute_status).toBe('accepted');
    expect(alloc.totals).toMatchObject({ subtotal: 30, total: 35 });
    expect(allocation.orders.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'o-1' }),
      expect.objectContaining({ $set: expect.objectContaining({ totals: expect.objectContaining({ total: 35 }) }) }),
    );
  });
});
