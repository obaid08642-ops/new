// ACCEPTANCE — Q-2 (docs/review/OPENCODE_QUEUE.md, Queue A). Written by the reviewer
// before the fix; the implementing agent makes it pass and may not edit it.
//
// Patients cannot act in their own pharmacy chat: PharmacyChatController puts
// @Roles(PHARMACY, ADMIN) on post-message, accept-substitute, reject and remove-item,
// so the order's patient gets 403 although PharmacyChatService already treats
// accept / reject / remove as the PATIENT's decisions (patient-app
// app/pharmacy/pharmacist-chat.tsx calls all four).
//
// Required behaviour, over HTTP with the real controller, the real guards
// (JwtAuthGuard + WriteGuard, production order), the real ValidationPipe settings,
// the real PharmacyChatService and real Mongo models:
//   - the order's patient can post, accept a substitute, reject, and remove the item
//     on their own thread, and each action has its real effect;
//   - another patient gets 403 or 404 on all four and nothing changes;
//   - the pharmacy of the thread can still post; accept / reject / remove stay the
//     patient's decisions (the pharmacy gets 403 and nothing changes);
//   - a pharmacy that is not on the thread gets 403 or 404.
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { PharmacyChatController } from '../../src/modules/pharmacy/pharmacy.controllers';
import { PharmacyChatService } from '../../src/modules/pharmacy/services/pharmacy-chat.service';
import { PharmacyChatThreadRepository } from '../../src/modules/pharmacy/services/repositories/pharmacychatthread.repository';
import { PharmacyChatMessageRepository } from '../../src/modules/pharmacy/services/repositories/pharmacychatmessage.repository';
import { PharmacyOrderRepository } from '../../src/modules/pharmacy/services/repositories/pharmacyorder.repository';
import { PharmacyAllocationRepository } from '../../src/modules/pharmacy/services/repositories/pharmacyallocation.repository';
import {
  PharmacyChatThread, PharmacyChatThreadSchema, PharmacyChatMessage, PharmacyChatMessageSchema,
  PharmacyOrder, PharmacyOrderSchema, PharmacyAllocation, PharmacyAllocationSchema,
} from '../../src/modules/pharmacy/schemas/pharmacy.schema';
import { EventBusService } from '../../src/modules/events/event-bus.service';
import { JwtAuthGuard } from '../../src/common/auth.guard';
import { WriteGuard } from '../../src/common/write-guard';
import { ImpersonationSessionService } from '../../src/common/impersonation-session.service';

jest.setTimeout(120_000);

const SECRET = 'q2-acceptance-secret';
const sign = (p: Record<string, unknown>) => new JwtService({ secret: SECRET }).sign(p);
// Token shapes as issued in production: patients by auth.service, pharmacies by provider-auth.service.
const patient = (id: string) => sign({ id, sub: id, role: 'patient' });
const pharmacy = (id: string) => sign({ id, sub: id, role: 'provider', provider_type: 'pharmacy', scope: 'provider' });

const OWNER = 'pat-owner';
const OTHER = 'pat-other';
const PHARM = 'pharm-acc-1';
const PHARM_OTHER = 'pharm-acc-2';

describe('Q-2: the order\'s patient acts in their own pharmacy chat', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let app: INestApplication;
  const emitted: any[] = [];

  // One order with two items; one open thread per scenario so each action starts from "open".
  const seed = async (threadId: string, itemId: string) => {
    await conn.collection('pharmacy_chat_threads').insertOne({
      id: threadId, order_id: 'ord-1', patient_account_id: OWNER, pharmacy_account_id: PHARM,
      order_item_id: itemId, status: 'open', createdAt: new Date(), updatedAt: new Date(),
    });
    await conn.collection('pharmacy_chat_messages').insertOne({
      id: `${threadId}-offer`, thread_id: threadId, sender_account_id: PHARM, sender_role: 'pharmacy',
      text: 'بديل متوفر', blocked: false,
      substitute_offer: { sku: 'SKU-SUB', name: 'Substitute 500mg', price: 12 },
      createdAt: new Date(), updatedAt: new Date(),
    });
  };
  const thread = (id: string) => conn.collection('pharmacy_chat_threads').findOne({ id });
  const order = () => conn.collection('pharmacy_orders').findOne({ id: 'ord-1' });
  const alloc = () => conn.collection('pharmacy_allocations').findOne({ id: 'alloc-1' });
  const call = (path: string, token: string, body: Record<string, unknown> = {}) =>
    request(app.getHttpServer()).post(`/api/v1/pharmacy/chat/threads/${path}`)
      .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', `k-${Math.random()}`).send(body);

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'q2' }).asPromise();
    const threads = conn.model(PharmacyChatThread.name, PharmacyChatThreadSchema);
    const messages = conn.model(PharmacyChatMessage.name, PharmacyChatMessageSchema);
    const orders = conn.model(PharmacyOrder.name, PharmacyOrderSchema);
    const allocs = conn.model(PharmacyAllocation.name, PharmacyAllocationSchema);

    await conn.collection('provider_accounts').insertMany([
      { id: PHARM, provider_type: 'pharmacy', status: 'approved' },
      { id: PHARM_OTHER, provider_type: 'pharmacy', status: 'approved' },
    ]);
    await conn.collection('pharmacy_orders').insertOne({
      id: 'ord-1', patient_account_id: OWNER, status: 'negotiating_substitutes',
      items: [{ id: 'item-a', sku: 'SKU-A', name: 'A', qty: 1 }, { id: 'item-b', sku: 'SKU-B', name: 'B', qty: 1 }, { id: 'item-c', sku: 'SKU-C', name: 'C', qty: 1 }],
      timeline: [],
    });
    await conn.collection('pharmacy_allocations').insertOne({
      id: 'alloc-1', order_id: 'ord-1', pharmacy_account_id: PHARM, offer_id: 'off-1', offer_version: 1, status: 'pending_review',
      items: [{ order_item_id: 'item-a', sku: 'SKU-A', name: 'A', unit_price: 10, action: 'available' }],
    });
    await seed('t-accept', 'item-a');
    await seed('t-reject', 'item-b');
    await seed('t-remove', 'item-c');

    process.env.JWT_SECRET = SECRET;
    const moduleRef = await Test.createTestingModule({
      controllers: [PharmacyChatController],
      providers: [
        PharmacyChatService,
        { provide: getModelToken(PharmacyChatThread.name), useValue: threads },
        { provide: getModelToken(PharmacyChatMessage.name), useValue: messages },
        { provide: getModelToken(PharmacyOrder.name), useValue: orders },
        { provide: getModelToken(PharmacyAllocation.name), useValue: allocs },
        { provide: 'PharmacyChatThreadRepository', useClass: PharmacyChatThreadRepository },
        { provide: 'PharmacyChatMessageRepository', useClass: PharmacyChatMessageRepository },
        { provide: 'PharmacyOrderRepository', useClass: PharmacyOrderRepository },
        { provide: 'PharmacyAllocationRepository', useClass: PharmacyAllocationRepository },
        { provide: EventBusService, useValue: { emit: async (e: any) => { emitted.push(e); } } },
        { provide: JwtService, useValue: new JwtService({ secret: SECRET }) },
        Reflector,
        { provide: getConnectionToken(), useValue: conn },
        { provide: ImpersonationSessionService, useValue: {} },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: WriteGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => { await app?.close(); await conn?.close(); await mongo?.stop(); });

  describe('another patient is refused and nothing changes', () => {
    it.each([
      ['post a message', 't-accept/messages', { text: 'hello' }],
      ['accept the substitute', 't-accept/accept-substitute/t-accept-offer', {}],
      ['reject', 't-reject/reject', {}],
      ['remove the item', 't-remove/remove-item', {}],
    ])('%s → 403/404', async (_label, path, body) => {
      const res = await call(path, patient(OTHER), body);
      expect([403, 404]).toContain(res.status);
    });
    it('the threads, the order and the allocation are unchanged', async () => {
      for (const id of ['t-accept', 't-reject', 't-remove']) expect((await thread(id))!.status).toBe('open');
      expect((await order())!.items.map((i: any) => i.id)).toEqual(['item-a', 'item-b', 'item-c']);
      expect((await alloc())!.items[0].sku).toBe('SKU-A');
      expect(await conn.collection('pharmacy_chat_messages').countDocuments({ sender_account_id: OTHER })).toBe(0);
    });
  });

  describe('a pharmacy that is not on the thread is refused', () => {
    it('post a message → 403/404', async () => {
      const res = await call('t-accept/messages', pharmacy(PHARM_OTHER), { text: 'hello' });
      expect([403, 404]).toContain(res.status);
      expect(await conn.collection('pharmacy_chat_messages').countDocuments({ sender_account_id: PHARM_OTHER })).toBe(0);
    });
  });

  describe('accept / reject / remove stay the patient\'s decisions', () => {
    it.each([
      ['accept the substitute', 't-accept/accept-substitute/t-accept-offer'],
      ['reject', 't-reject/reject'],
      ['remove the item', 't-remove/remove-item'],
    ])('the thread\'s pharmacy cannot %s → 403', async (_label, path) => {
      const res = await call(path, pharmacy(PHARM));
      expect(res.status).toBe(403);
    });
    it('nothing changed', async () => {
      for (const id of ['t-accept', 't-reject', 't-remove']) expect((await thread(id))!.status).toBe('open');
      expect((await order())!.items).toHaveLength(3);
    });
  });

  describe('the thread\'s pharmacy can still write', () => {
    it('post a message → 201, stored as the pharmacy', async () => {
      const res = await call('t-accept/messages', pharmacy(PHARM), { text: 'متوفر عندنا بديل' });
      expect(res.status).toBe(201);
      const m = await conn.collection('pharmacy_chat_messages').findOne({ id: res.body.id });
      expect(m).toMatchObject({ thread_id: 't-accept', sender_account_id: PHARM, sender_role: 'pharmacy' });
    });
  });

  describe('the order\'s patient can do the four actions on their own thread', () => {
    it('post a message → 201, stored as the patient', async () => {
      const res = await call('t-accept/messages', patient(OWNER), { text: 'هل البديل بنفس التركيز؟' });
      expect(res.status).toBe(201);
      const m = await conn.collection('pharmacy_chat_messages').findOne({ id: res.body.id });
      expect(m).toMatchObject({ thread_id: 't-accept', sender_account_id: OWNER, sender_role: 'patient', text: 'هل البديل بنفس التركيز؟' });
    });

    it('the patient\'s message is still screened (a phone number is blocked)', async () => {
      const res = await call('t-accept/messages', patient(OWNER), { text: 'كلمني 0551234567' });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('content_blocked');
    });

    it('accept the substitute → 2xx; the thread closes as accepted and the allocation item becomes the substitute', async () => {
      const res = await call('t-accept/accept-substitute/t-accept-offer', patient(OWNER));
      expect([200, 201]).toContain(res.status);
      expect(await thread('t-accept')).toMatchObject({ status: 'closed', resolution: 'accepted' });
      expect((await alloc())!.items[0]).toMatchObject({ order_item_id: 'item-a', action: 'substitute', sku: 'SKU-SUB', substitute_for_sku: 'SKU-A', unit_price: 12 });
      expect(emitted.map((e) => e.type)).toContain('substitute.accepted');
    });

    it('reject → 2xx; the thread closes as rejected and the order keeps the item', async () => {
      const res = await call('t-reject/reject', patient(OWNER));
      expect([200, 201]).toContain(res.status);
      expect(await thread('t-reject')).toMatchObject({ status: 'closed', resolution: 'rejected' });
      expect((await order())!.items.map((i: any) => i.id)).toContain('item-b');
      expect(emitted.map((e) => e.type)).toContain('substitute.rejected');
    });

    it('remove the item → 2xx; the thread closes as removed and the item leaves the order', async () => {
      const res = await call('t-remove/remove-item', patient(OWNER));
      expect([200, 201]).toContain(res.status);
      expect(await thread('t-remove')).toMatchObject({ status: 'closed', resolution: 'removed' });
      const o = await order();
      expect(o!.items.map((i: any) => i.id)).toEqual(['item-a', 'item-b']);
      expect(o!.timeline.map((t: any) => t.event)).toContain('item_removed_from_order');
      expect(emitted.map((e) => e.type)).toContain('substitute.item_removed');
    });

    it('a closed thread refuses a new message (400 thread_closed), also for the patient', async () => {
      const res = await call('t-reject/messages', patient(OWNER), { text: 'hello' });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('thread_closed');
    });
  });
});
