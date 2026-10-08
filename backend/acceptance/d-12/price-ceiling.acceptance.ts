// ACCEPTANCE — D-12 price ceiling on pharmacy offers (owner decision 2026-10-06 item 12, answer O-1:
// the ceiling is the catalogue price held in the server database). Written by the reviewer before the
// work; the implementing agent makes it pass and may not edit it (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB replica set and a local Redis.
//
// Required behaviour
//   1. Catalogue fields `sfda_price`, `sfda_price_source`, `sfda_price_updated_at`, filled from the
//      catalogue `price` by scripts/migrations/2026-10-sfda-price-from-catalogue.ts (repo convention:
//      dry-run by default, `--apply` writes; MONGODB_URI, DB_NAME); source text contains "catalogue".
//   2. A pharmacy offer line mapped to a catalogue item (inventory sku == catalogue sku, or the
//      inventory row's medicine_id) may not be priced above that item's `sfda_price`: listed price or
//      `unit_price_override` above it -> 400 (code mentions the ceiling). At or below is fine.
//   3. A medicine line that cannot be mapped to the catalogue is kept but marked "price not verified"
//      (the offer item says `not_verified`), appears in the admin review list
//      GET /api/v1/admin/pharmacy/price-review, and the offer cannot be SUBMITTED while such a line
//      remains (400, code mentions price_not_verified).
//   4. The admin edits an item's ceiling (PATCH /medicines/admin/catalog/:id { sfda_price }); every
//      change is audit-logged with the old and new value; a patient cannot.
import { spawnSync } from 'child_process';
import * as path from 'path';
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const BACKEND = path.resolve(__dirname, '../..');
const PHARM = 'ph-1';
const HOUR = 3_600_000;

describe('D-12: price ceiling = catalogue price', () => {
  const stack = new LiveStack();
  let pharmacy = '';
  let admin = '';
  let patient = '';
  const migrate = (apply: boolean) => spawnSync('npx', ['ts-node', '--transpile-only', 'scripts/migrations/2026-10-sfda-price-from-catalogue.ts', ...(apply ? ['--apply'] : [])], {
    cwd: BACKEND, encoding: 'utf8', env: { ...process.env, MONGODB_URI: stack.mongo.getUri(), DB_NAME: 'nabd_acceptance' },
  });
  const draft = (items: unknown[]) => stack.call(0, 'POST', '/api/v1/provider/pharmacy/broadcasts/ord-1/offers/draft', pharmacy, { items });
  const line = (order_item_id: string, inventory_item_id: string, extra: Record<string, unknown> = {}) => ({ order_item_id, availability: 'available', inventory_item_id, ...extra });

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('medicines').insertMany([
        { id: 'med-a', sku: 4001, name_ar: 'دواء أ', name_en: 'Medicine A', price: 80, requires_prescription: false, controlled: false, public_eligibility: true, medical_review_status: 'approved' },
        { id: 'med-b', sku: 4002, name_ar: 'دواء ب', name_en: 'Medicine B', price: 30, requires_prescription: false, controlled: false, public_eligibility: true, medical_review_status: 'approved' },
      ]);
      await db.collection('provider_accounts').insertOne({ id: PHARM, provider_type: 'pharmacy', status: 'approved', email: 'ph@ph.test' });
      await db.collection('provider_capabilities_pharmacy').insertMany([
        { id: 'inv-a', provider_account_id: PHARM, sku: '4001', name_ar: 'دواء أ', price: 95, currency: 'SAR', stock: 10, available: true },
        { id: 'inv-b', provider_account_id: PHARM, sku: '4002', name_ar: 'دواء ب', price: 30, currency: 'SAR', stock: 10, available: true },
        { id: 'inv-x', provider_account_id: PHARM, sku: 'LOCAL-77', name_ar: 'مرهم محلي', price: 20, currency: 'SAR', stock: 10, available: true },
      ]);
      await db.collection('pharmacy_orders').insertOne({
        id: 'ord-1', patient_account_id: 'pat-1', status: 'broadcasting', payment_method: 'card', fulfillment: 'delivery', timeline: [],
        items: [
          { id: 'l-a', raw_name: 'Medicine A', matched_sku: '4001', qty: 1, match_status: 'manual' },
          { id: 'l-b', raw_name: 'Medicine B', matched_sku: '4002', qty: 1, match_status: 'manual' },
          { id: 'l-x', raw_name: 'مرهم من صورة العلبة', qty: 1, match_status: 'manual', intake_source: 'photo' },
        ],
        totals: { subtotal: 0, delivery_fee: 0, total: 0, currency: 'SAR' }, createdAt: new Date(), updatedAt: new Date(),
      });
      await db.collection('pharmacy_broadcasts').insertOne({ id: 'bc-1', order_id: 'ord-1', patient_account_id: 'pat-1', current_round: 1, lock_state: 'open', notified_pharmacies: [PHARM], responses: [], round_expires_at: new Date(Date.now() + HOUR), timeline: [] });
    });
    pharmacy = new JwtService({ secret: JWT_SECRET }).sign({ id: PHARM, sub: PHARM, role: 'provider', provider_type: 'pharmacy', scope: 'provider' });
    admin = await stack.admin('adm-1');
    patient = await stack.patient('pat-1');
  });
  afterAll(async () => { await stack.stop(); });

  describe('the ceiling comes from the catalogue price', () => {
    it('dry-run changes nothing', async () => {
      const r = migrate(false);
      expect([r.status, r.stderr.slice(-400)]).toEqual([0, expect.anything()]);
      expect((await stack.db.collection('medicines').findOne({ id: 'med-a' }))?.sfda_price).toBeUndefined();
    });
    it('--apply fills sfda_price, its source and date from price', async () => {
      const r = migrate(true);
      expect([r.status, r.stderr.slice(-400)]).toEqual([0, expect.anything()]);
      const m = await stack.db.collection('medicines').findOne({ id: 'med-a' });
      expect(m?.sfda_price).toBe(80);
      expect(String(m?.sfda_price_source)).toMatch(/catalogue/i);
      expect(m?.sfda_price_updated_at).toBeTruthy();
    });
  });

  describe('offers', () => {
    it('a line listed above the ceiling (95 > 80) is refused', async () => {
      const r = await draft([line('l-a', 'inv-a'), line('l-b', 'inv-b'), line('l-x', 'inv-x')]);
      expect(r.status).toBe(400);
      expect(JSON.stringify(r.body)).toMatch(/ceiling|sfda/i);
    });
    it('an override above the ceiling (85) is refused too', async () => {
      const r = await draft([line('l-a', 'inv-a', { unit_price_override: 85, price_override_reason: 'x' }), line('l-b', 'inv-b'), line('l-x', 'inv-x')]);
      expect(r.status).toBe(400);
    });
    it('at the ceiling it is accepted; the unmapped line is kept and marked not verified', async () => {
      const r = await draft([line('l-a', 'inv-a', { unit_price_override: 80, price_override_reason: 'ceiling' }), line('l-b', 'inv-b'), line('l-x', 'inv-x')]);
      expect(r.status).toBeLessThan(300);
      const offer = await stack.db.collection('pharmacy_offers').findOne({ order_id: 'ord-1', pharmacy_account_id: PHARM });
      const x = (offer?.items || []).find((i: any) => i.order_item_id === 'l-x');
      expect(JSON.stringify(x)).toMatch(/not_verified/);
      const a = (offer?.items || []).find((i: any) => i.order_item_id === 'l-a');
      expect(a?.unit_price).toBe(80);
    });
    it('the unmapped line is in the admin review list', async () => {
      const r = await stack.call(0, 'GET', '/api/v1/admin/pharmacy/price-review', admin);
      expect(r.status).toBe(200);
      expect(JSON.stringify(r.body)).toContain('ord-1');
      expect((await stack.call(0, 'GET', '/api/v1/admin/pharmacy/price-review', patient)).status).toBe(403);
    });
    it('the offer cannot be submitted while a line is not verified', async () => {
      const offer = await stack.db.collection('pharmacy_offers').findOne({ order_id: 'ord-1', pharmacy_account_id: PHARM });
      const r = await stack.call(0, 'POST', `/api/v1/provider/pharmacy/broadcasts/ord-1/offers/${offer?.id}/submit`, pharmacy, {});
      expect(r.status).toBe(400);
      expect(JSON.stringify(r.body)).toMatch(/price_not_verified/);
    });
  });

  describe('admin edits are audit-logged', () => {
    it('a patient cannot change the ceiling', async () => {
      expect((await stack.call(0, 'PATCH', '/api/v1/medicines/admin/catalog/med-b', patient, { sfda_price: 1 })).status).toBe(403);
    });
    it('the admin changes it and the change is logged with old and new values', async () => {
      const r = await stack.call(0, 'PATCH', '/api/v1/medicines/admin/catalog/med-b', admin, { sfda_price: 35 });
      expect(r.status).toBeLessThan(300);
      expect((await stack.db.collection('medicines').findOne({ id: 'med-b' }))?.sfda_price).toBe(35);
      const logs = [
        ...(await stack.db.collection('system_events').find({ entity_id: 'med-b' }).toArray()),
        ...(await stack.db.collection('audit_logs').find({}).toArray()),
        ...(await stack.db.collection('admin_audit_logs').find({}).toArray()),
      ];
      const hit = logs.find((l: any) => /sfda|price/i.test(JSON.stringify(l)) && JSON.stringify(l).includes('35') && JSON.stringify(l).includes('30'));
      expect(hit).toBeTruthy();
    });
  });
});
