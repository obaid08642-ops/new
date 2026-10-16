import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PharmacyChatService } from './pharmacy-chat.service';

/**
 * Issues 479/480: the pharmacy opens the negotiation of one line of an order it is part of, and may attach a substitute from
 * its own inventory, checked against the prescription (issue 1440). The patient only answers.
 */
describe('pharmacy order chat', () => {
  const PHARM = { id: 'ph-1', role: 'pharmacy' };
  const PATIENT = { id: 'pat-1', role: 'patient' };
  const ORDER = { id: 'o-1', patient_account_id: 'pat-1', status: 'confirmed', items: [{ id: 'oi-1', medicine_id: 'med-orig', requires_prescription: true }] };
  const lean = (v: unknown) => ({ lean: async () => v });

  function build(opts: { alloc?: unknown; offer?: unknown; order?: unknown; inventory?: unknown; medicines?: Record<string, unknown> } = {}) {
    const order = 'order' in opts ? opts.order : ORDER;
    const created: any[] = [];
    const thread: any = { id: 't-1', order_id: 'o-1', order_item_id: 'oi-1', patient_account_id: 'pat-1', pharmacy_account_id: 'ph-1', status: 'open', save: jest.fn(async () => null) };
    const threads = {
      findOne: jest.fn((q: any) => (q.id ? Promise.resolve(thread) : Promise.resolve(null))),
      create: jest.fn(async (doc: any) => ({ ...doc, toObject: () => doc })),
    };
    const messages = { create: jest.fn(async (m: any) => { created.push(m); return { ...m, toObject: () => m }; }) };
    const meds = opts.medicines || {};
    const db = {
      collection: (name: string) => ({
        findOne: jest.fn(async (q: any) => {
          if (name === 'pharmacy_offers') return opts.offer ?? null;
          if (name === 'provider_capabilities_pharmacy') return q.provider_account_id === 'ph-1' ? opts.inventory ?? null : null;
          if (name === 'medicines') {
            const ids = (q.$or || [{ id: q.id }]).map((c: any) => c.id).filter(Boolean);
            return ids.map((id: string) => meds[id]).find(Boolean) ?? null;
          }
          return null;
        }),
      }),
    };
    const orders = { findOne: jest.fn(() => lean(order)), db };
    const allocs = { findOne: jest.fn(() => lean(opts.alloc ?? null)) };
    const bus = { emit: jest.fn(async () => null) };
    const svc = new PharmacyChatService(threads as any, messages as any, orders as any, allocs as any, bus as any, {} as never);
    return { svc, threads, created, bus };
  }

  it('opens a thread for a line of an order the pharmacy holds', async () => {
    const { svc, threads } = build({ alloc: { id: 'a-1' } });
    const t = await svc.openForPharmacy(PHARM, 'o-1', 'oi-1');
    expect(t).toMatchObject({ order_id: 'o-1', order_item_id: 'oi-1', patient_account_id: 'pat-1', pharmacy_account_id: 'ph-1', status: 'open' });
    expect(threads.create).toHaveBeenCalledTimes(1);
  });

  it('refuses a pharmacy that is not part of the order, a patient, an unknown line and a finished order', async () => {
    await expect(build().svc.openForPharmacy(PHARM, 'o-1', 'oi-1')).rejects.toThrow('not_part_of_order');
    await expect(build({ alloc: { id: 'a-1' } }).svc.openForPharmacy(PATIENT, 'o-1', 'oi-1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(build({ offer: { id: 'of-1' } }).svc.openForPharmacy(PHARM, 'o-1', 'oi-x')).rejects.toThrow('order_item_not_found');
    await expect(build({ offer: { id: 'of-1' }, order: { ...ORDER, status: 'delivered' } }).svc.openForPharmacy(PHARM, 'o-1', 'oi-1')).rejects.toThrow('order_closed');
  });

  const amox = { id: 'med-orig', active_ingredient: 'amoxicillin', strength: '500mg', form: 'capsule' };

  it('attaches a substitute inside the prescription with the inventory name and price', async () => {
    const { svc, created, bus } = build({
      inventory: { id: 'inv-gen', sku: 'med-gen', name_ar: 'أموكسيسيلين', name_en: 'Amoxicillin', price: 25 },
      medicines: { 'med-orig': amox, 'med-gen': { ...amox, id: 'med-gen' } },
    });
    await svc.postMessage(PHARM, 't-1', { text: 'بديل', substitute_offer: { inventory_item_id: 'inv-gen' } });
    expect(created[0].substitute_offer).toEqual({ inventory_item_id: 'inv-gen', sku: 'med-gen', name: 'أموكسيسيلين', name_en: 'Amoxicillin', price: 25, notes: undefined });
    expect(bus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'substitute.proposed' }));
  });

  it('refuses a substitute outside the prescription, from another inventory, or from the patient', async () => {
    const outside = build({ inventory: { id: 'inv-w', sku: 'med-w', price: 20 }, medicines: { 'med-orig': amox, 'med-w': { ...amox, strength: '250mg' } } });
    await expect(outside.svc.postMessage(PHARM, 't-1', { substitute_offer: { inventory_item_id: 'inv-w' } })).rejects.toThrow(BadRequestException);
    expect(outside.created).toHaveLength(0);
    const none = build({ medicines: { 'med-orig': amox } });
    await expect(none.svc.postMessage(PHARM, 't-1', { substitute_offer: { inventory_item_id: 'inv-other' } })).rejects.toThrow('inventory_item_not_available');
    await expect(build().svc.postMessage(PATIENT, 't-1', { substitute_offer: { inventory_item_id: 'inv-gen' } })).rejects.toThrow('substitute_from_pharmacy_only');
  });
});
