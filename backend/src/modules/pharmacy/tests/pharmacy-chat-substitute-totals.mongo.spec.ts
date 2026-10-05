// 13.R2 (cc6e7bb): accepting a substitute in the pharmacy chat changed only the
// allocation line. The allocation, order and quote-snapshot totals kept the old
// price, so the patient paid (and the pharmacy collected) the old total for a
// different medicine. Real MongoDB, real schemas and repositories.
import { BadRequestException } from '@nestjs/common';
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as crypto from 'crypto';
import { PharmacyChatService } from '../services/pharmacy-chat.service';
import {
  PharmacyAllocation, PharmacyAllocationSchema, PharmacyChatMessage, PharmacyChatMessageSchema,
  PharmacyChatThread, PharmacyChatThreadSchema, PharmacyOrder, PharmacyOrderSchema,
} from '../schemas/pharmacy.schema';
import { PharmacyChatThreadRepository } from '../services/repositories/pharmacychatthread.repository';
import { PharmacyChatMessageRepository } from '../services/repositories/pharmacychatmessage.repository';
import { PharmacyOrderRepository } from '../services/repositories/pharmacyorder.repository';
import { PharmacyAllocationRepository } from '../services/repositories/pharmacyallocation.repository';

jest.setTimeout(60_000);

describe('accepting a chat substitute updates the totals (real MongoDB)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: PharmacyChatService;
  const patient = { id: 'patient-1', role: 'patient' };
  const hashOf = (offerId: string, version: number, totals: object) =>
    crypto.createHash('sha256').update(JSON.stringify({ offer_id: offerId, offer_version: version, totals })).digest('hex');

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'r2_substitute' }).asPromise();
    const threads = new PharmacyChatThreadRepository(conn.model(PharmacyChatThread.name, PharmacyChatThreadSchema));
    const messages = new PharmacyChatMessageRepository(conn.model(PharmacyChatMessage.name, PharmacyChatMessageSchema));
    const orders = new PharmacyOrderRepository(conn.model(PharmacyOrder.name, PharmacyOrderSchema));
    const allocs = new PharmacyAllocationRepository(conn.model(PharmacyAllocation.name, PharmacyAllocationSchema));
    svc = new PharmacyChatService(threads, messages, orders, allocs, { emit: jest.fn().mockResolvedValue(undefined) } as never);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    const db = conn.db!;
    for (const c of ['pharmacy_chat_threads', 'pharmacy_chat_messages', 'pharmacy_orders', 'pharmacy_allocations', 'pharmacy_payment_evidence']) {
      await db.collection(c).deleteMany({});
    }
    // Quote: 2 x Panadol @ 10 + 1 x Vitamin C @ 15, delivery 12 -> subtotal 35, total 47.
    const quoted = { subtotal: 35, delivery_fee: 12, total: 47, currency: 'SAR' };
    await db.collection('pharmacy_orders').insertOne({
      id: 'order-1', patient_account_id: 'patient-1', status: 'cash_card_payment_pending',
      items: [{ id: 'oi-1', raw_name: 'Panadol', qty: 2 }, { id: 'oi-2', raw_name: 'Vitamin C', qty: 1 }],
      selected_offer_id: 'offer-1', selected_offer_version: 1, selected_allocation_id: 'alloc-1',
      totals: quoted, pricing_snapshot: { offer_id: 'offer-1', offer_version: 1, totals: quoted, hash: hashOf('offer-1', 1, quoted) },
      timeline: [],
    });
    await db.collection('pharmacy_allocations').insertOne({
      id: 'alloc-1', order_id: 'order-1', pharmacy_account_id: 'pharmacy-1', status: 'pending_review', offer_id: 'offer-1', offer_version: 1,
      items: [
        { id: 'ai-1', order_item_id: 'oi-1', action: 'available', sku: 'PAN-500', name: 'Panadol', qty_requested: 2, qty_offered: 2, unit_price: 10 },
        { id: 'ai-2', order_item_id: 'oi-2', action: 'available', sku: 'VITC', name: 'Vitamin C', qty_requested: 1, qty_offered: 1, unit_price: 15 },
      ],
      totals: quoted, timeline: [],
    });
    await db.collection('pharmacy_chat_threads').insertOne({
      id: 'thread-1', order_id: 'order-1', order_item_id: 'oi-1', patient_account_id: 'patient-1', pharmacy_account_id: 'pharmacy-1', status: 'open',
    });
    await db.collection('pharmacy_chat_messages').insertOne({
      id: 'msg-1', thread_id: 'thread-1', sender_account_id: 'pharmacy-1', sender_role: 'pharmacy',
      substitute_offer: { sku: 'ADOL-500', name: 'Adol 500', price: 12.5 },
    });
  });

  it('recomputes allocation, order and quote-snapshot totals with the substitute price', async () => {
    const res = await svc.acceptSubstitute(patient, 'thread-1', 'msg-1');
    // 2 x 12.5 + 1 x 15 = 40, + 12 delivery = 52.
    const expected = { subtotal: 40, delivery_fee: 12, total: 52, currency: 'SAR' };
    expect(res).toEqual({ ok: true, totals: expected });

    const alloc = await conn.db!.collection('pharmacy_allocations').findOne({ id: 'alloc-1' });
    expect(alloc?.totals).toEqual(expected);
    expect(alloc?.items[0]).toMatchObject({ action: 'substitute', sku: 'ADOL-500', substitute_for_sku: 'PAN-500', unit_price: 12.5 });

    const order = await conn.db!.collection('pharmacy_orders').findOne({ id: 'order-1' });
    expect(order?.totals).toEqual(expected);
    expect(order?.pricing_snapshot).toMatchObject({ offer_id: 'offer-1', offer_version: 1, totals: expected, hash: hashOf('offer-1', 1, expected) });
    expect(order?.timeline.map((e: { event: string }) => e.event)).toContain('substitute_accepted_totals_updated');
  });

  it('refuses a "substitute" that the patient wrote, not the pharmacy', async () => {
    await conn.db!.collection('pharmacy_chat_messages').insertOne({
      id: 'msg-2', thread_id: 'thread-1', sender_account_id: 'patient-1', sender_role: 'patient',
      substitute_offer: { sku: 'FREE', name: 'Free', price: 0 },
    });
    await expect(svc.acceptSubstitute(patient, 'thread-1', 'msg-2')).rejects.toBeInstanceOf(BadRequestException);
    const order = await conn.db!.collection('pharmacy_orders').findOne({ id: 'order-1' });
    expect(order?.totals.total).toBe(47);
  });

  it('does not move the price once a payment for the current quote is confirmed', async () => {
    const order = await conn.db!.collection('pharmacy_orders').findOne({ id: 'order-1' });
    await conn.db!.collection('pharmacy_payment_evidence').insertOne({ order_id: 'order-1', status: 'confirmed', quote_snapshot_hash: order?.pricing_snapshot.hash, amount: 47 });
    await expect(svc.acceptSubstitute(patient, 'thread-1', 'msg-1')).rejects.toThrow('substitute_after_payment_requires_new_quote');
    const alloc = await conn.db!.collection('pharmacy_allocations').findOne({ id: 'alloc-1' });
    expect(alloc?.totals.total).toBe(47);
    expect(alloc?.items[0].sku).toBe('PAN-500');
  });
});
