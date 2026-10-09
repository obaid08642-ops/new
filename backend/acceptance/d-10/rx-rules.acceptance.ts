// ACCEPTANCE — D-10 prescription-only rules on the server (owner decision 2026-10-06 item 10,
// issue #329; Queue C). Written by the reviewer before the work; the implementing agent makes it
// pass and may not edit it (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB replica set and a local
// Redis; the test talks to it over HTTP. The loyalty part runs LoyaltyModule in-process on the
// same database.
//
// Catalogue flags (schemas/medicine.schema.ts): requires_prescription (Rx), controlled.
// Required behaviour on the canonical pharmacy flow (POST/PATCH /patient/pharmacy/orders, submit):
//   1. The server decides which lines are Rx/controlled from the CATALOGUE, never from client flags:
//      a line is a catalogue item when it carries that item's `medicine_id`, its `sku`, or exactly
//      its name (name_ar / name_en, trimmed, case-insensitive).
//   2. An order with an Rx line and no prescription is refused (HTTP 400, code containing
//      "prescription_required") no later than submit; it never starts a broadcast.
//      A prescription is either an attached image/pdf (`prescription_attachments[].uri`) or a
//      `prescription_id` of the SAME patient's prescription (another patient's or an unknown id
//      does not count).
//   3. An order with a `controlled` line is always refused (HTTP 400, code containing "controlled"),
//      with or without a prescription; it never starts a broadcast.
//   4. No discount on Rx lines: a pharmacy cannot quote an Rx line below its own listed price
//      (`unit_price_override` lower than the inventory price -> 400). OTC lines keep the override.
//   5. No loyalty points for Rx items: a delivered order whose lines are all Rx earns no points; an
//      OTC order still earns them.
// Out of scope (stated so nobody "fixes" it here): coupons have no path into pharmacy orders today;
// when one is added it must exclude Rx lines (new queue item).
import { Test } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { INestApplicationContext } from '@nestjs/common';
import { LiveStack, JWT_SECRET } from './live-server';
import { LoyaltyModule } from '../../src/modules/loyalty/loyalty.module';
import { JwtAuthGuard } from '../../src/common/auth.guard';

jest.setTimeout(600_000);

const OTC = { id: 'med-otc', sku: 1001, name_ar: 'بنادول ٥٠٠', name_en: 'Panadol 500' };
const RX = { id: 'med-rx', sku: 1002, name_ar: 'أوجمنتين ١ جم', name_en: 'Augmentin 1g' };
const CTL = { id: 'med-ctl', sku: 1003, name_ar: 'ترامادول ٥٠', name_en: 'Tramadol 50' };
const PHARM = 'pharm-acc-1';
const image = [{ type: 'image', uri: 'https://files.example/rx-photo.jpg' }];
const address = { label: 'home', city: 'Jeddah', district: 'Al Rawdah', street: 'Street 1', lat: 21.5433, lng: 39.1728 };

describe('D-10: prescription-only rules on the server', () => {
  const stack = new LiveStack();
  let p1 = '';
  let p2 = '';
  let pharmacy = '';

  /** Create, then submit. Returns both answers and the stored order. */
  const place = async (token: string, items: unknown[], extra: Record<string, unknown> = {}) => {
    const create = await stack.call(0, 'POST', '/api/v1/patient/pharmacy/orders', token, { items, delivery_address: address, payment_method: 'cash', fulfillment: 'delivery', ...extra });
    const id = create.body?.id;
    const submit = id && create.status < 300 ? await stack.call(0, 'POST', `/api/v1/patient/pharmacy/orders/${id}/submit`, token) : null;
    const order = id ? await stack.db.collection('pharmacy_orders').findOne({ id }) : null;
    const broadcast = id ? await stack.db.collection('pharmacy_broadcasts').findOne({ order_id: id }) : null;
    return { create, submit, order, broadcast, id };
  };
  const refused = (r: Awaited<ReturnType<typeof place>>, code: string) => {
    const answer = r.create.status >= 400 ? r.create : r.submit;
    return !!answer && answer.status === 400 && JSON.stringify(answer.body).includes(code)
      && !r.broadcast && !['broadcasting', 'ready_for_split'].includes(String(r.order?.status));
  };
  const accepted = (r: Awaited<ReturnType<typeof place>>) =>
    r.create.status < 300 && !!r.submit && r.submit.status < 300 && !!r.broadcast;

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      const pub = { public_eligibility: true, medical_review_status: 'approved', verified: true, category: 'medications', price: 0 };
      await db.collection('medicines').insertMany([
        { ...pub, ...OTC, price: 12, requires_prescription: false, controlled: false },
        { ...pub, ...RX, price: 80, requires_prescription: true, controlled: false },
        { ...pub, ...CTL, price: 40, requires_prescription: true, controlled: true },
      ]);
      await db.collection('system_configs').insertOne({ key: 'pharmacy_broadcast_stages', value: [{ stage: 1, radius_km: 3, timeout_seconds: 300 }, { stage: 2, radius_km: 7, timeout_seconds: 300 }] });
      await db.collection('prescriptions').insertMany([
        { id: 'rx-p1', patient_id: 'pat-1', state: 'UPLOADED_BY_PATIENT', upload_image: 'https://files.example/p1.jpg', items: [{ medicine_id: RX.id, medicine_name_en: RX.name_en, quantity: 1 }], createdAt: new Date() },
        { id: 'rx-p2', patient_id: 'pat-2', state: 'UPLOADED_BY_PATIENT', upload_image: 'https://files.example/p2.jpg', items: [{ medicine_id: RX.id, medicine_name_en: RX.name_en, quantity: 1 }], createdAt: new Date() },
      ]);
      await db.collection('provider_accounts').insertOne({ id: PHARM, provider_type: 'pharmacy', status: 'approved', name_ar: 'صيدلية', token_version: 0 });
      await db.collection('provider_capabilities_pharmacy').insertMany([
        { id: 'inv-otc', provider_account_id: PHARM, sku: String(OTC.sku), name_ar: OTC.name_ar, name_en: OTC.name_en, price: 12, currency: 'SAR', stock: 50, available: true },
        { id: 'inv-rx', provider_account_id: PHARM, sku: String(RX.sku), name_ar: RX.name_ar, name_en: RX.name_en, price: 80, currency: 'SAR', stock: 50, available: true },
      ]);
    });
    p1 = await stack.patient('pat-1');
    p2 = await stack.patient('pat-2');
    pharmacy = new JwtService({ secret: JWT_SECRET }).sign({ id: PHARM, sub: PHARM, role: 'provider', provider_type: 'pharmacy', scope: 'provider' });
  });
  afterAll(async () => { await stack.stop(); });

  describe('which lines are Rx comes from the catalogue', () => {
    it('control: an OTC-only order goes through without a prescription', async () => {
      expect(accepted(await place(p1, [{ medicine_id: OTC.id, qty: 1 }]))).toBe(true);
    });
    it('Rx line by medicine_id, no prescription -> refused', async () => {
      expect(refused(await place(p1, [{ medicine_id: RX.id, qty: 1 }]), 'prescription_required')).toBe(true);
    });
    it('Rx line by sku only -> refused', async () => {
      expect(refused(await place(p1, [{ sku: String(RX.sku), qty: 1 }]), 'prescription_required')).toBe(true);
    });
    it('Rx line by its exact catalogue name only (English, other case) -> refused', async () => {
      expect(refused(await place(p1, [{ name: `  ${RX.name_en.toUpperCase()} `, qty: 1 }]), 'prescription_required')).toBe(true);
    });
    it('Rx line by its exact Arabic name only -> refused', async () => {
      expect(refused(await place(p1, [{ name_ar: RX.name_ar, qty: 1 }]), 'prescription_required')).toBe(true);
    });
    it('a client flag saying "not Rx" is ignored -> refused', async () => {
      expect(refused(await place(p1, [{ medicine_id: RX.id, requires_prescription: false, is_rx: false, qty: 1 }]), 'prescription_required')).toBe(true);
    });
    it('an Rx line added later with PATCH is checked at submit -> refused', async () => {
      const create = await stack.call(0, 'POST', '/api/v1/patient/pharmacy/orders', p1, { items: [{ medicine_id: OTC.id, qty: 1 }], delivery_address: address, payment_method: 'cash', fulfillment: 'delivery' });
      expect(create.status).toBeLessThan(300);
      const patch = await stack.call(0, 'PATCH', `/api/v1/patient/pharmacy/orders/${create.body.id}`, p1, { items: [{ medicine_id: OTC.id, qty: 1 }, { medicine_id: RX.id, qty: 1 }] });
      const submit = patch.status < 300 ? await stack.call(0, 'POST', `/api/v1/patient/pharmacy/orders/${create.body.id}/submit`, p1) : patch;
      expect(submit.status).toBe(400);
      expect(JSON.stringify(submit.body)).toContain('prescription_required');
      expect(await stack.db.collection('pharmacy_broadcasts').findOne({ order_id: create.body.id })).toBeNull();
    });
  });

  describe('what counts as a prescription', () => {
    it('an attached prescription photo -> accepted', async () => {
      expect(accepted(await place(p1, [{ medicine_id: RX.id, qty: 1 }], { prescription_attachments: image }))).toBe(true);
    });
    it('the patient\'s own prescription_id -> accepted', async () => {
      expect(accepted(await place(p1, [{ medicine_id: RX.id, qty: 1 }], { prescription_id: 'rx-p1' }))).toBe(true);
    });
    it('another patient\'s prescription_id -> refused', async () => {
      expect(refused(await place(p1, [{ medicine_id: RX.id, qty: 1 }], { prescription_id: 'rx-p2' }), 'prescription_required')).toBe(true);
    });
    it('an unknown prescription_id -> refused', async () => {
      expect(refused(await place(p1, [{ medicine_id: RX.id, qty: 1 }], { prescription_id: 'rx-none' }), 'prescription_required')).toBe(true);
    });
    it('an attachment without a file (no uri) does not count -> refused', async () => {
      expect(refused(await place(p1, [{ medicine_id: RX.id, qty: 1 }], { prescription_attachments: [{ type: 'image' }] }), 'prescription_required')).toBe(true);
    });
  });

  describe('controlled items are never orderable', () => {
    it('controlled line without a prescription -> refused', async () => {
      expect(refused(await place(p2, [{ medicine_id: CTL.id, qty: 1 }]), 'controlled')).toBe(true);
    });
    it('controlled line WITH a prescription photo -> still refused', async () => {
      expect(refused(await place(p2, [{ medicine_id: CTL.id, qty: 1 }], { prescription_attachments: image }), 'controlled')).toBe(true);
    });
    it('controlled line by name, mixed with OTC -> the whole order is refused', async () => {
      expect(refused(await place(p2, [{ medicine_id: OTC.id, qty: 1 }, { name_en: CTL.name_en, qty: 1 }], { prescription_attachments: image }), 'controlled')).toBe(true);
    });
  });

  describe('no discount on Rx lines (pharmacy quote)', () => {
    let orderId = '';
    let lines: any[] = [];
    beforeAll(async () => {
      const r = await place(p2, [{ medicine_id: OTC.id, sku: String(OTC.sku), qty: 1 }, { medicine_id: RX.id, sku: String(RX.sku), qty: 1 }], { prescription_attachments: image });
      expect(accepted(r)).toBe(true);
      orderId = r.id;
      await stack.db.collection('pharmacy_broadcasts').updateOne({ order_id: orderId }, { $addToSet: { notified_pharmacies: PHARM }, $set: { lock_state: 'open' } });
      lines = (await stack.db.collection('pharmacy_orders').findOne({ id: orderId }))!.items;
    });
    const lineFor = (sku: number) => lines.find((l) => String(l.matched_sku ?? l.sku ?? '') === String(sku) || l.medicine_id === (sku === RX.sku ? RX.id : OTC.id));
    const draft = (rxOverride?: number, otcOverride?: number) => stack.call(0, 'POST', `/api/v1/provider/pharmacy/broadcasts/${orderId}/offers/draft`, pharmacy, {
      items: [
        { order_item_id: lineFor(OTC.sku).id, availability: 'available', inventory_item_id: 'inv-otc', ...(otcOverride !== undefined ? { unit_price_override: otcOverride, price_override_reason: 'promo' } : {}) },
        { order_item_id: lineFor(RX.sku).id, availability: 'available', inventory_item_id: 'inv-rx', ...(rxOverride !== undefined ? { unit_price_override: rxOverride, price_override_reason: 'promo' } : {}) },
      ],
    });

    it('control: a quote at the listed prices is accepted', async () => {
      expect((await draft()).status).toBeLessThan(300);
    });
    it('a lower price on the Rx line is refused', async () => {
      const r = await draft(60);
      expect(r.status).toBe(400);
      const offer = await stack.db.collection('pharmacy_offers').findOne({ order_id: orderId });
      const rxItem = offer?.items?.find((i: any) => i.inventory_item_id === 'inv-rx');
      expect(rxItem?.unit_price).toBe(80);
    });
    it('a lower price on the OTC line is still allowed', async () => {
      expect((await draft(undefined, 10)).status).toBeLessThan(300);
    });
  });

  describe('no loyalty points for Rx items', () => {
    let ctx: INestApplicationContext;
    let bus: EventEmitter2;
    let rxOrder = '';
    let otcOrder = '';
    beforeAll(async () => {
      const a = await place(p1, [{ medicine_id: RX.id, qty: 1 }], { prescription_attachments: image });
      const b = await place(p1, [{ medicine_id: OTC.id, qty: 2 }]);
      expect(accepted(a) && accepted(b)).toBe(true);
      rxOrder = a.id; otcOrder = b.id;
      const ref = await Test.createTestingModule({
        imports: [EventEmitterModule.forRoot(), MongooseModule.forRoot(stack.mongo.getUri(), { dbName: 'nabd_acceptance' }), LoyaltyModule],
      }).overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true }).compile(); // HTTP guard only; no route is called here
      ctx = await ref.init();
      bus = ctx.get(EventEmitter2);
    });
    afterAll(async () => { await ctx?.close(); });
    const points = async () => {
      const acc = await stack.db.collection('loyalty_accounts').findOne({ user_id: 'pat-1' });
      return Number(acc?.points ?? 0);
    };
    const deliver = async (id: string) => {
      // what the workflow engine emits when a pharmacy order reaches DELIVERED
      await bus.emitAsync('service.completed', { type: 'service.completed', entity_type: 'order', entity_id: id, patient_account_id: 'pat-1', meta: { kind: 'pharmacy', to_domain: 'DELIVERED' } });
      await new Promise((r) => setTimeout(r, 500));
    };
    it('an all-Rx order earns no points', async () => {
      const before = await points();
      await deliver(rxOrder);
      expect(await points()).toBe(before);
    });
    it('control: an OTC order still earns points', async () => {
      const before = await points();
      await deliver(otcOrder);
      expect(await points()).toBeGreaterThan(before);
    });
  });
});
