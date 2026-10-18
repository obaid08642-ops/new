/**
 * 22.5 — order changes: edit a sent order before a pharmacy is chosen (the quotes made for the old version must be
 * requoted), and split off what the chosen pharmacy could not fill. Real in-memory Mongo; the order is a small model over
 * the collection so `save()` and `markModified()` behave like Mongoose documents.
 */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PharmacyOrderService, unfilledItems, draftOrEditable } from './pharmacy-order.service';
import { PharmacyOrderState } from '../schemas/pharmacy.schema';

jest.setTimeout(120_000);

describe('22.5 order changes', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let service: PharmacyOrderService;
  const events: any[] = [];
  const created: any[] = [];

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'order-changes' }).asPromise();
    const col = conn.collection('pharmacy_orders');
    const wrap = (doc: any) => doc && Object.assign(doc, {
      markModified: () => undefined,
      save: async () => { const { save, markModified, toObject, ...plain } = doc; await col.replaceOne({ id: doc.id }, plain); return doc; },
      toObject: () => { const { save, markModified, toObject, ...plain } = doc; return plain; },
    });
    const orders: any = {
      findOne: (q: any) => { const p: any = col.findOne(q); p.lean = async () => col.findOne(q); const then = p.then.bind(p); return Object.assign(Promise.resolve(then((d: any) => wrap(d))), { lean: async () => col.findOne(q) }); },
      // like the real repository: updateOne is findOneAndUpdate, answering the updated order or null
      updateOne: async (q: any, u: any) => { const r: any = await col.findOneAndUpdate(q, u, { returnDocument: 'after' }); return r && 'ok' in r && 'value' in r ? r.value : r ?? null; },
      create: async (doc: any) => { created.push(doc); await col.insertOne({ ...doc }); return wrap({ ...doc }); },
    };
    const allocs: any = {
      findOne: (q: any) => ({ lean: async () => conn.collection('pharmacy_allocations').findOne(q) }),
      find: (q: any) => ({ lean: async () => conn.collection('pharmacy_allocations').find(q).toArray() }),
    };
    const bus: any = { emit: jest.fn(async (e: any) => { events.push(e); }) };
    const engine: any = { announceCreated: jest.fn(async () => undefined), transition: jest.fn() };
    service = new PharmacyOrderService(orders, allocs, {} as any, {} as any, {} as any, bus, engine, conn);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    events.length = 0;
    created.length = 0;
    for (const n of ['pharmacy_orders', 'pharmacy_allocations', 'pharmacy_offers', 'medicines', 'prescriptions', 'storage_objects']) {
      if (!(await conn.db!.collections()).some((c) => c.collectionName === n)) await conn.createCollection(n).catch(() => undefined);
      await conn.collection(n).deleteMany({});
    }
  });

  const patient = { id: 'pat', role: 'patient' };
  const seedOrder = (over: Record<string, unknown> = {}) => conn.collection('pharmacy_orders').insertOne({
    id: 'o1', patient_account_id: 'pat', status: PharmacyOrderState.BROADCASTING, edit_revision: 1,
    items: [{ id: 'i1', raw_name: 'Panadol', qty: 2 }, { id: 'i2', raw_name: 'Vitamin C', qty: 1 }],
    delivery_address: { street: 'Olaya 1', lat: 24.7, lng: 46.7 }, timeline: [], ...over,
  });
  const seedOffer = (id: string, status: string, pharmacy: string) => conn.collection('pharmacy_offers').insertOne({
    id, order_id: 'o1', pharmacy_account_id: pharmacy, status, version: 1, items: [], timeline: [], submitted_at: new Date(),
  });

  describe('edit after the order was sent', () => {
    it('edits the lines of a broadcasting order, bumps the revision, and sends every quote back to a draft that must be requoted', async () => {
      await seedOrder();
      await seedOffer('of1', 'submitted', 'ph1');
      await seedOffer('of2', 'draft', 'ph2');
      const out = await service.update(patient, 'o1', { items: [{ id: 'i1', raw_name: 'Panadol', qty: 4 }, { id: 'i2', raw_name: 'Vitamin C', qty: 1 }] });
      expect(out.items[0].qty).toBe(4);
      expect(out.edit_revision).toBe(2);
      expect(out.status).toBe(PharmacyOrderState.BROADCASTING); // the broadcast stays open
      const offers: any[] = await conn.collection('pharmacy_offers').find({}).sort({ id: 1 }).toArray();
      expect(offers.map((o) => [o.status, o.requote_required])).toEqual([['draft', true], ['draft', true]]);
      expect(offers[0].submitted_at).toBeUndefined();
      expect(offers[0].timeline[0]).toMatchObject({ event: 'order_edited_requote_required', meta: { revision: 2 } });
      expect(events[0]).toMatchObject({ type: 'pharmacy.order.edited', entity_id: 'o1', meta: { revision: 2, offers_to_requote: 2 } });
      expect(out.timeline.at(-1)).toMatchObject({ event: 'edited_after_submit' });
    });

    it('a note alone changes no quote: nothing is requoted and the revision stays', async () => {
      await seedOrder();
      await seedOffer('of1', 'submitted', 'ph1');
      const out = await service.update(patient, 'o1', { patient_notes: 'ring twice' });
      expect(out.patient_notes).toBe('ring twice');
      expect(out.edit_revision).toBe(1);
      expect((await conn.collection('pharmacy_offers').findOne({ id: 'of1' }))?.status).toBe('submitted');
      expect(events).toHaveLength(0);
    });

    it('a prescription item added after sending is refused without a prescription (never bypassed), and nothing is touched', async () => {
      await conn.collection('medicines').insertOne({ id: 'rx-1', name_en: 'Amoxicillin', requires_prescription: true });
      await seedOrder();
      await seedOffer('of1', 'submitted', 'ph1');
      await expect(service.update(patient, 'o1', { items: [{ id: 'i1', raw_name: 'Amoxicillin', medicine_id: 'rx-1', qty: 1 }] })).rejects.toThrow();
      expect((await conn.collection('pharmacy_offers').findOne({ id: 'of1' }))?.status).toBe('submitted');
      expect((await conn.collection('pharmacy_orders').findOne({ id: 'o1' }))?.items[0].raw_name).toBe('Panadol');
    });

    it('is refused once a pharmacy is chosen, once an allocation exists, in later states, and for someone else\'s order', async () => {
      await seedOrder({ selected_offer_id: 'of1' });
      await expect(service.update(patient, 'o1', { items: [{ raw_name: 'x', qty: 1 }] })).rejects.toThrow('not_editable_after_offer_selected');
      await conn.collection('pharmacy_orders').updateOne({ id: 'o1' }, { $unset: { selected_offer_id: '' } });
      await conn.collection('pharmacy_allocations').insertOne({ id: 'al1', order_id: 'o1', status: 'pending_review', items: [] });
      await expect(service.update(patient, 'o1', { patient_notes: 'x' })).rejects.toThrow('not_editable_after_offer_selected');
      await conn.collection('pharmacy_allocations').deleteMany({});
      await conn.collection('pharmacy_orders').updateOne({ id: 'o1' }, { $set: { status: PharmacyOrderState.OUT_FOR_DELIVERY } });
      await expect(service.update(patient, 'o1', { patient_notes: 'x' })).rejects.toThrow('not_editable_in_out_for_delivery');
      await expect(service.update({ id: 'other', role: 'patient' }, 'o1', { patient_notes: 'x' })).rejects.toThrow('not_yours');
    });

    it('a draft is edited exactly as before: no revision, no offers touched', async () => {
      await seedOrder({ status: PharmacyOrderState.DRAFT });
      const out = await service.update(patient, 'o1', { items: [{ id: 'i1', raw_name: 'Panadol', qty: 3 }] });
      expect(out.items[0].qty).toBe(3);
      expect(out.edit_revision).toBe(1);
      expect(events).toHaveLength(0);
    });

    it('draftOrEditable tells the clients whether an edit would be accepted', () => {
      expect(draftOrEditable({ status: PharmacyOrderState.DRAFT }, [])).toBe(true);
      expect(draftOrEditable({ status: PharmacyOrderState.BROADCASTING }, [])).toBe(true);
      expect(draftOrEditable({ status: PharmacyOrderState.BROADCASTING, selected_offer_id: 'x' }, [])).toBe(false);
      expect(draftOrEditable({ status: PharmacyOrderState.BROADCASTING }, [{ id: 'a' }])).toBe(false);
      expect(draftOrEditable({ status: PharmacyOrderState.DELIVERED }, [])).toBe(false);
    });
  });

  describe('split what the chosen pharmacy could not fill', () => {
    beforeEach(async () => { await conn.collection('prescriptions').insertOne({ id: 'rx-9', patient_id: 'pat' }); });
    const selectedOrder = (over: Record<string, unknown> = {}) => seedOrder({
      status: PharmacyOrderState.CASH_CARD_PAYMENT_PENDING, selected_offer_id: 'of1', payment_mode: 'cash', fulfillment: 'delivery',
      items: [{ id: 'i1', raw_name: 'Panadol', qty: 3, matched_sku: 'sku-1' }, { id: 'i2', raw_name: 'Vitamin C', qty: 1 }, { id: 'i3', raw_name: 'Aspirin', qty: 2 }],
      prescription_attachments: [{ uri: '/api/v1/storage/rx-file', type: 'image' }], prescription_id: 'rx-9',
      ...over,
    });
    const alloc = (items: any[], status = 'pending_review') => conn.collection('pharmacy_allocations').insertOne({ id: 'al1', order_id: 'o1', status, items });

    it('computes what is left: unavailable lines in full, short lines by the missing quantity, covered lines not at all', () => {
      const order = { items: [{ id: 'i1', qty: 3 }, { id: 'i2', qty: 1 }, { id: 'i3', qty: 2 }] };
      const alloc1 = { status: 'pending_review', items: [{ order_item_id: 'i1', action: 'available', qty_offered: 2 }, { order_item_id: 'i2', action: 'unavailable', qty_offered: 0 }, { order_item_id: 'i3', action: 'available', qty_offered: 2 }] };
      expect(unfilledItems(order, [alloc1])).toEqual([{ order_item_id: 'i1', remaining: 1 }, { order_item_id: 'i2', remaining: 1 }]);
      expect(unfilledItems(order, [{ ...alloc1, status: 'cancelled' }])).toHaveLength(3); // a cancelled allocation covers nothing
      expect(unfilledItems(order, [alloc1, { status: 'confirmed', items: [{ order_item_id: 'i2', action: 'available', qty_offered: 1 }] }])).toEqual([{ order_item_id: 'i1', remaining: 1 }]);
    });

    it('creates one linked draft order with only the missing lines and quantities, the same address and prescription', async () => {
      await selectedOrder();
      await alloc([{ order_item_id: 'i1', action: 'available', qty_offered: 2 }, { order_item_id: 'i2', action: 'unavailable', qty_offered: 0 }, { order_item_id: 'i3', action: 'available', qty_offered: 2 }]);
      const r = await service.splitRemaining(patient, 'o1');
      expect(r).toMatchObject({ ok: true, existing: false, items: 2 });
      const child: any = await conn.collection('pharmacy_orders').findOne({ id: r.child_order_id });
      expect(child.status).toBe(PharmacyOrderState.DRAFT);
      expect(child.items.map((i: any) => [i.raw_name, i.qty])).toEqual([['Panadol', 1], ['Vitamin C', 1]]);
      expect(child.items.map((i: any) => i.id)).not.toContain('i1'); // new lines, new ids
      expect(child).toMatchObject({ parent_order_id: 'o1', split_from_offer_id: 'of1', patient_account_id: 'pat', delivery_address: { street: 'Olaya 1' }, prescription_id: 'rx-9' });
      expect(child.prescription_attachments).toEqual([{ uri: '/api/v1/storage/rx-file', type: 'image' }]);
      const parent: any = await conn.collection('pharmacy_orders').findOne({ id: 'o1' });
      expect(parent.split_child_order_id).toBe(child.id);
      expect(parent.timeline.at(-1)).toMatchObject({ event: 'split_remaining_created', meta: { items: 2 } });
      expect(events.find((e) => e.type === 'pharmacy.order.split')).toMatchObject({ entity_id: 'o1', meta: { child_order_id: child.id } });
    });

    it('asking again returns the same child; two at once make exactly one', async () => {
      await selectedOrder();
      await alloc([{ order_item_id: 'i1', action: 'available', qty_offered: 3 }, { order_item_id: 'i2', action: 'unavailable', qty_offered: 0 }, { order_item_id: 'i3', action: 'available', qty_offered: 2 }]);
      const results = await Promise.allSettled([service.splitRemaining(patient, 'o1'), service.splitRemaining(patient, 'o1'), service.splitRemaining(patient, 'o1')]);
      const ok = results.filter((r) => r.status === 'fulfilled').map((r: any) => r.value);
      const refused = results.filter((r) => r.status === 'rejected').map((r: any) => r.reason);
      expect(created).toHaveLength(1);
      expect(new Set(ok.map((r) => r.child_order_id)).size).toBe(1);
      for (const e of refused) expect(e).toBeInstanceOf(ConflictException);
      const again = await service.splitRemaining(patient, 'o1');
      expect(again).toMatchObject({ existing: true, child_order_id: ok[0].child_order_id });
    });

    it('an empty or null marker on the order does not block the split', async () => {
      for (const marker of [null, '']) {
        await selectedOrder();
        await alloc([{ order_item_id: 'i1', action: 'available', qty_offered: 3 }, { order_item_id: 'i2', action: 'unavailable', qty_offered: 0 }, { order_item_id: 'i3', action: 'available', qty_offered: 2 }]);
        await conn.collection('pharmacy_orders').updateOne({ id: 'o1' }, { $set: { split_child_order_id: marker } });
        expect(await service.splitRemaining(patient, 'o1')).toMatchObject({ ok: true, existing: false });
        await conn.collection('pharmacy_orders').deleteMany({}); await conn.collection('pharmacy_allocations').deleteMany({});
      }
    });

    it('refuses: nothing left, no chosen offer, a cancelled order, someone else\'s order', async () => {
      await selectedOrder();
      await alloc([{ order_item_id: 'i1', action: 'available', qty_offered: 3 }, { order_item_id: 'i2', action: 'available', qty_offered: 1 }, { order_item_id: 'i3', action: 'available', qty_offered: 2 }]);
      await expect(service.splitRemaining(patient, 'o1')).rejects.toThrow('nothing_to_split');
      expect((await conn.collection('pharmacy_orders').findOne({ id: 'o1' }))?.split_claim).toBeUndefined(); // the claim is released
      await conn.collection('pharmacy_orders').updateOne({ id: 'o1' }, { $unset: { selected_offer_id: '' } });
      await expect(service.splitRemaining(patient, 'o1')).rejects.toThrow('select_an_offer_first');
      await conn.collection('pharmacy_orders').updateOne({ id: 'o1' }, { $set: { selected_offer_id: 'of1', status: PharmacyOrderState.CANCELLED } });
      await expect(service.splitRemaining(patient, 'o1')).rejects.toThrow('cannot_split_in_cancelled');
      await expect(service.splitRemaining({ id: 'other', role: 'patient' }, 'o1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('a failure while creating the child releases the claim, so the patient can try again', async () => {
      await selectedOrder();
      await alloc([{ order_item_id: 'i1', action: 'unavailable', qty_offered: 0 }, { order_item_id: 'i2', action: 'available', qty_offered: 1 }, { order_item_id: 'i3', action: 'available', qty_offered: 2 }]);
      const spy = jest.spyOn(service, 'create').mockRejectedValueOnce(new BadRequestException('boom'));
      await expect(service.splitRemaining(patient, 'o1')).rejects.toThrow('boom');
      spy.mockRestore();
      expect((await conn.collection('pharmacy_orders').findOne({ id: 'o1' }))?.split_child_order_id).toBeUndefined();
      expect(await service.splitRemaining(patient, 'o1')).toMatchObject({ ok: true, existing: false });
    });
  });
});
