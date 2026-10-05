// 13.R2 (cc6e7bb) end to end on a real MongoDB: the pharmacy proposes a
// substitute in the chat, the patient answers in the same thread, then
// accepts (totals follow the substitute price) or rejects (the line leaves
// the order and the allocation, totals follow). The patient message route
// must accept patients, since both clients show a send box.
import { Reflector } from '@nestjs/core';
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PharmacyChatService } from '../services/pharmacy-chat.service';
import { PharmacyChatController } from '../pharmacy.controllers';
import { ROLES_KEY } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
import {
  PharmacyAllocation, PharmacyAllocationSchema, PharmacyChatMessage, PharmacyChatMessageSchema,
  PharmacyChatThread, PharmacyChatThreadSchema, PharmacyOrder, PharmacyOrderSchema,
} from '../schemas/pharmacy.schema';
import { PharmacyChatThreadRepository } from '../services/repositories/pharmacychatthread.repository';
import { PharmacyChatMessageRepository } from '../services/repositories/pharmacychatmessage.repository';
import { PharmacyOrderRepository } from '../services/repositories/pharmacyorder.repository';
import { PharmacyAllocationRepository } from '../services/repositories/pharmacyallocation.repository';

jest.setTimeout(60_000);

describe('pharmacy chat negotiation propose -> accept / reject (real MongoDB)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: PharmacyChatService;
  const patient = { id: 'patient-1', role: 'patient' };
  const pharmacy = { id: 'pharmacy-1', role: 'provider' };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'r2_negotiation' }).asPromise();
    svc = new PharmacyChatService(
      new PharmacyChatThreadRepository(conn.model(PharmacyChatThread.name, PharmacyChatThreadSchema)),
      new PharmacyChatMessageRepository(conn.model(PharmacyChatMessage.name, PharmacyChatMessageSchema)),
      new PharmacyOrderRepository(conn.model(PharmacyOrder.name, PharmacyOrderSchema)),
      new PharmacyAllocationRepository(conn.model(PharmacyAllocation.name, PharmacyAllocationSchema)),
      { emit: jest.fn().mockResolvedValue(undefined) } as never,
    );
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  beforeEach(async () => {
    const db = conn.db!;
    for (const c of ['pharmacy_chat_threads', 'pharmacy_chat_messages', 'pharmacy_orders', 'pharmacy_allocations', 'pharmacy_payment_evidence']) await db.collection(c).deleteMany({});
    // 2 x Panadol @ 10 + 1 x Vitamin C @ 15 + 12 delivery = 47.
    const quoted = { subtotal: 35, delivery_fee: 12, total: 47, currency: 'SAR' };
    await db.collection('pharmacy_orders').insertOne({
      id: 'order-1', patient_account_id: 'patient-1', status: 'cash_card_payment_pending',
      items: [{ id: 'oi-1', raw_name: 'Panadol', qty: 2 }, { id: 'oi-2', raw_name: 'Vitamin C', qty: 1 }],
      selected_offer_id: 'offer-1', selected_offer_version: 1, selected_allocation_id: 'alloc-1',
      totals: quoted, pricing_snapshot: { offer_id: 'offer-1', offer_version: 1, totals: quoted, hash: 'h0' }, timeline: [],
    });
    await db.collection('pharmacy_allocations').insertOne({
      id: 'alloc-1', order_id: 'order-1', pharmacy_account_id: 'pharmacy-1', status: 'pending_review', offer_id: 'offer-1', offer_version: 1,
      items: [
        { id: 'ai-1', order_item_id: 'oi-1', action: 'available', sku: 'PAN-500', name: 'Panadol', qty_requested: 2, qty_offered: 2, unit_price: 10 },
        { id: 'ai-2', order_item_id: 'oi-2', action: 'available', sku: 'VITC', name: 'Vitamin C', qty_requested: 1, qty_offered: 1, unit_price: 15 },
      ],
      totals: quoted, timeline: [],
    });
  });

  async function propose() {
    const thread = await svc.openOrGetThread('order-1', 'oi-1', 'pharmacy-1');
    const offer = await svc.postMessage(pharmacy, thread.id, { text: 'Panadol is out, Adol is the same', substitute_offer: { sku: 'ADOL-500', name: 'Adol 500', price: 12.5 } });
    return { threadId: thread.id, messageId: offer.id as string };
  }

  it('the patient can reply in the negotiation thread (route allows patients)', async () => {
    const roles = new Reflector().getAllAndOverride<string[]>(ROLES_KEY, [PharmacyChatController.prototype.post, PharmacyChatController]);
    expect(roles).toContain(UserRole.PATIENT);
    const { threadId } = await propose();
    await svc.postMessage(patient, threadId, { text: 'Is it the same dose?' });
    const { messages } = await svc.listMessages(patient, threadId);
    expect(messages.map((m: { sender_role: string }) => m.sender_role)).toEqual(['pharmacy', 'patient']);
  });

  it('a patient message cannot carry a substitute offer', async () => {
    const { threadId } = await propose();
    const forged = await svc.postMessage(patient, threadId, { text: 'free please', substitute_offer: { sku: 'X', name: 'X', price: 0 } });
    expect(forged.substitute_offer).toBeUndefined();
  });

  it('propose -> accept: allocation, order and snapshot totals follow the substitute price', async () => {
    const { threadId, messageId } = await propose();
    const res = await svc.acceptSubstitute(patient, threadId, messageId);
    const expected = { subtotal: 40, delivery_fee: 12, total: 52, currency: 'SAR' };
    expect(res).toEqual({ ok: true, totals: expected });
    const order = await conn.db!.collection('pharmacy_orders').findOne({ id: 'order-1' });
    expect(order?.totals).toEqual(expected);
    expect(order?.pricing_snapshot.totals).toEqual(expected);
  });

  it('propose -> reject: the line leaves the order and the allocation and totals drop to 27', async () => {
    const { threadId } = await propose();
    const res = await svc.rejectOrRemove(patient, threadId, 'rejected');
    const expected = { subtotal: 15, delivery_fee: 12, total: 27, currency: 'SAR' };
    expect(res).toEqual({ ok: true, totals: expected });
    const order = await conn.db!.collection('pharmacy_orders').findOne({ id: 'order-1' });
    expect(order?.items.map((i: { id: string }) => i.id)).toEqual(['oi-2']);
    expect(order?.totals).toEqual(expected);
    expect(order?.pricing_snapshot.totals).toEqual(expected);
    const alloc = await conn.db!.collection('pharmacy_allocations').findOne({ id: 'alloc-1' });
    expect(alloc?.items.map((i: { order_item_id: string }) => i.order_item_id)).toEqual(['oi-2']);
    expect(alloc?.totals).toEqual(expected);
  });

  it('remove-item also recomputes the allocation and order totals', async () => {
    const { threadId } = await propose();
    await svc.rejectOrRemove(patient, threadId, 'removed');
    const alloc = await conn.db!.collection('pharmacy_allocations').findOne({ id: 'alloc-1' });
    expect(alloc?.totals.total).toBe(27);
  });

  it('after a confirmed payment the line cannot be removed', async () => {
    const { threadId } = await propose();
    await conn.db!.collection('pharmacy_payment_evidence').insertOne({ order_id: 'order-1', status: 'confirmed', quote_snapshot_hash: 'h0' });
    await expect(svc.rejectOrRemove(patient, threadId, 'rejected')).rejects.toThrow('item_change_after_payment_requires_new_quote');
    const order = await conn.db!.collection('pharmacy_orders').findOne({ id: 'order-1' });
    expect(order?.items).toHaveLength(2);
  });
});
