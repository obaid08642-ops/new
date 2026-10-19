// ACCEPTANCE — Ordering model M1: the provider item model (docs/product/ORDERING_MODEL_2026-10-16.md phase M1,
// ORDERING_UX_SPEC §3). Written by the reviewer before the work; the implementing agent makes it pass and may not edit
// it (nor live-server.ts next to it). Backend part only; the provider-app and admin declaration screens (M6) call these routes.
//
// Reviewer decisions (the owner can redirect):
//   * A provider's ordering declaration is the provider's own commercial data: it takes effect at once (no admin approval
//     delta), and every write adds an `audit_logs` row. The national catalogue content (names, preparation text) stays
//     admin-governed; the existing `/provider/capabilities/*` routes and their approval flow are unchanged.
//   * Prices are cash prices per mode (home / facility) now; network prices later (owner decision 2).
//
// Contract (under /api/v1, provider token of a lab, radiology or nursing provider):
//   PUT /provider/ordering/settings  { modes: ['home'|'facility', …] (≥1), home_fee ≥ 0, home_radius_km (0 < r ≤ 50),
//        auto_accept: boolean, walk_in: boolean, staff_genders: ['female'|'male', …],
//        accepted_insurance: [{ company_id, classes: string[] (≥1), active }] }
//        400 `ordering_modes_required`, `home_radius_invalid`, `home_fee_invalid`, `accepted_insurance_classes_required`.
//        GET returns the same object. A lab that does not offer `home` has no home fee.
//   PUT /provider/ordering/items  { service_kind: 'lab'|'radiology'|'nursing', catalog_id, modes?, prices: { home?, facility? },
//        accepted_insurance?: [{ company_id, classes (≥1), active }] | null, turnaround_hours?, preparation?: { ar?, en? }, available? }
//        `modes` omitted = inherit the provider's modes (the row reads back `inherited.modes = true`);
//        `accepted_insurance` omitted = inherit the provider's; `null`-free override replaces it for this item only.
//        400 `item_mode_not_offered` (a price or mode the provider does not offer), `home_radiology_portable_only`
//        (a radiology scan is offered at home only when its catalogue row has `portable_ultrasound: true`),
//        `item_price_invalid` (negative or not a number), `item_insurance_classes_required`, 404 `catalog_item_not_found`.
//   GET /provider/ordering/items?service_kind=lab  → rows with the effective `modes`, `prices`, `accepted_insurance`, `inherited`.
//   POST /provider/ordering/items/bulk-price { service_kind, mode, percent? | set_price?, catalog_ids? (omitted = all) }
//        one change to many items; returns { updated: n }.
//   POST /provider/ordering/items/copy-mode { service_kind, from, to }  copies every item's price from one mode to the other
//        where the destination is empty (and allowed); returns { copied: n }.
//   GET  /provider/ordering/items/export?service_kind=lab  → CSV text, header `catalog_id,mode,price`.
//   POST /provider/ordering/items/import { service_kind, csv } → { imported: n, rejected: [{ line, reason }] }
//        rows that would be refused by PUT /items are rejected with a reason, the rest are applied.
//   GET  /provider/ordering/completeness → { score: 0..100, parts: { prices, modes_hours, insurance, prep_turnaround, photo_licence },
//        missing: [{ part, count }] } with the owner's weights (SystemConfig `ordering_completeness_weights`, defaults
//        prices 40, modes_hours 20, insurance 20, prep_turnaround 10, photo_licence 10).
//   POST /admin/ordering/migrate-capabilities (super_admin) converts the legacy rows (`provider_capabilities_lab|radiology`)
//        and is idempotent: `home_collection_supported: true` → modes [home, facility], else [facility];
//        legacy `price` → both modes' prices; `insurance_covered: true` → no per-item override (inherits the provider's);
//        returns { migrated: n }; a second call returns { migrated: 0 }. Existing readers keep working (legacy rows stay).
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const BUPA = 'ins-bupa-m1';
const LAB = 'lab-m1';
const LAB_OLD = 'lab-m1-legacy';
const RAD = 'rad-m1';
const NURSE = 'nurse-m1';
const PATIENT = 'pat-m1';

const sign = (payload: Record<string, unknown>) => new JwtService({ secret: JWT_SECRET }).sign(payload);
const providerToken = (id: string, type: string) => sign({ id, sub: id, role: 'provider', provider_type: type, scope: 'provider' });

describe('M1 provider item model', () => {
  const stack = new LiveStack();
  let lab = '';
  let rad = '';
  let nurse = '';
  let patient = '';
  let admin = '';

  const put = (path: string, token: string, body: unknown) => stack.call(0, 'PUT', `/api/v1${path}`, token, body);
  const post = (path: string, token: string, body: unknown) => stack.call(0, 'POST', `/api/v1${path}`, token, body);
  const get = (path: string, token: string) => stack.call(0, 'GET', `/api/v1${path}`, token);
  const row = (rows: any, id: string) => (Array.isArray(rows) ? rows : rows?.items || []).find((r: any) => r.catalog_id === id);

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('insurance_companies').insertOne({ id: BUPA, name_ar: 'بوبا', name_en: 'Bupa', active: true, is_active: true });
      await db.collection('lab_services').insertMany([
        { id: 'cbc', code: 'CBC', name_ar: 'صورة دم', name_en: 'CBC', price: 40, active: true },
        { id: 'hba1c', code: 'HBA1C', name_ar: 'سكر تراكمي', name_en: 'HbA1c', price: 60, active: true },
        { id: 'vitd', code: 'VITD', name_ar: 'فيتامين د', name_en: 'Vitamin D', price: 90, active: true },
      ]);
      await db.collection('radiology_services').insertMany([
        { id: 'us-abd', name_ar: 'سونار بطن', modality: 'ultrasound', price: 150, portable_ultrasound: true, active: true },
        { id: 'mri-knee', name_ar: 'رنين ركبة', modality: 'mri', price: 900, portable_ultrasound: false, active: true },
      ]);
      await db.collection('nursing_catalog').insertMany([
        { id: 'dressing', name_ar: 'تغيير جرح', name_en: 'Wound dressing', price: 80, active: true },
      ]);
      for (const [id, type] of [[LAB, 'lab'], [LAB_OLD, 'lab'], [RAD, 'radiology'], [NURSE, 'nurse']] as const) {
        await db.collection('provider_accounts').insertOne({ id, provider_type: type, status: 'approved', availability: {} });
        await db.collection('provider_profiles').insertOne({
          id, user_id: id, account_id: id, provider_type: type, type, status: 'active',
          name_ar: `مزود ${id}`, geo: { lat: 24.7136, lng: 46.6753 }, medical_license_number: `LIC-${id}`,
        });
      }
      // legacy rows (the pre-M1 model): one price, a home flag, a yes/no insurance flag
      await db.collection('provider_capabilities_lab').insertMany([
        { id: 'leg-1', provider_account_id: LAB_OLD, code: 'CBC', name_ar: 'صورة دم', price: 35, home_collection_supported: true, insurance_covered: true, available: true },
        { id: 'leg-2', provider_account_id: LAB_OLD, code: 'HBA1C', name_ar: 'سكر تراكمي', price: 55, home_collection_supported: false, insurance_covered: false, available: true },
      ]);
    });
    lab = providerToken(LAB, 'lab');
    rad = providerToken(RAD, 'radiology');
    nurse = providerToken(NURSE, 'nurse');
    patient = await stack.patient(PATIENT);
    admin = await stack.admin('adm-m1');
  });
  afterAll(async () => { await stack.stop(); });

  it('1. provider settings: modes, home fee and radius, auto-accept, genders, insurers with classes; each is validated', async () => {
    const noModes = await put('/provider/ordering/settings', lab, { modes: [], home_fee: 0, home_radius_km: 10 });
    expect(noModes.status).toBe(400);
    expect(JSON.stringify(noModes.body)).toContain('ordering_modes_required');
    const badRadius = await put('/provider/ordering/settings', lab, { modes: ['home'], home_fee: 20, home_radius_km: 0 });
    expect(badRadius.status).toBe(400);
    expect(JSON.stringify(badRadius.body)).toContain('home_radius_invalid');
    const farRadius = await put('/provider/ordering/settings', lab, { modes: ['home'], home_fee: 20, home_radius_km: 500 });
    expect(JSON.stringify(farRadius.body)).toContain('home_radius_invalid');
    const badFee = await put('/provider/ordering/settings', lab, { modes: ['home'], home_fee: -1, home_radius_km: 10 });
    expect(JSON.stringify(badFee.body)).toContain('home_fee_invalid');
    const noClass = await put('/provider/ordering/settings', lab, { modes: ['home', 'facility'], home_fee: 20, home_radius_km: 10, accepted_insurance: [{ company_id: BUPA, active: true }] });
    expect(noClass.status).toBe(400);
    expect(JSON.stringify(noClass.body)).toContain('accepted_insurance_classes_required');

    const ok = await put('/provider/ordering/settings', lab, {
      modes: ['home', 'facility'], home_fee: 25, home_radius_km: 12, auto_accept: true, walk_in: true,
      staff_genders: ['female', 'male'], accepted_insurance: [{ company_id: BUPA, classes: ['A', 'VIP'], active: true }],
    });
    expect(ok.status).toBeLessThan(300);
    const back = await get('/provider/ordering/settings', lab);
    expect(back.body).toMatchObject({ modes: ['home', 'facility'], home_fee: 25, home_radius_km: 12, auto_accept: true, walk_in: true });
    expect(back.body.staff_genders).toEqual(expect.arrayContaining(['female', 'male']));
    expect(back.body.accepted_insurance[0]).toMatchObject({ company_id: BUPA, active: true });
    expect(back.body.accepted_insurance[0].classes).toEqual(expect.arrayContaining(['A', 'VIP']));
  });

  it('2. a patient or a provider of another kind cannot write ordering settings; a provider never reads another provider\'s', async () => {
    expect((await put('/provider/ordering/settings', patient, { modes: ['facility'], home_fee: 0, home_radius_km: 5 })).status).toBe(403);
    const mine = await get('/provider/ordering/settings', rad);
    expect(mine.body?.home_fee ?? 0).not.toBe(25); // the lab's settings are not the radiology centre's
  });

  it('3. an item inherits the provider\'s modes and insurers; an override replaces only that item', async () => {
    const inherit = await put('/provider/ordering/items', lab, { service_kind: 'lab', catalog_id: 'cbc', prices: { home: 55, facility: 40 } });
    expect(inherit.status).toBeLessThan(300);
    const rows = await get('/provider/ordering/items?service_kind=lab', lab);
    const cbc = row(rows.body, 'cbc');
    expect(cbc).toMatchObject({ prices: { home: 55, facility: 40 } });
    expect(cbc.modes).toEqual(expect.arrayContaining(['home', 'facility']));
    expect(cbc.inherited?.modes).toBe(true);
    expect(cbc.accepted_insurance[0].classes).toEqual(expect.arrayContaining(['A', 'VIP']));

    const override = await put('/provider/ordering/items', lab, {
      service_kind: 'lab', catalog_id: 'hba1c', modes: ['facility'], prices: { facility: 70 },
      accepted_insurance: [{ company_id: BUPA, classes: ['VIP'], active: true }],
      turnaround_hours: 6, preparation: { ar: 'صيام 8 ساعات', en: 'Fast 8 hours' },
    });
    expect(override.status).toBeLessThan(300);
    const h = row((await get('/provider/ordering/items?service_kind=lab', lab)).body, 'hba1c');
    expect(h.modes).toEqual(['facility']);
    expect(h.inherited?.modes).toBe(false);
    expect(h.accepted_insurance[0].classes).toEqual(['VIP']);
    expect(h).toMatchObject({ turnaround_hours: 6 });
    expect(h.preparation).toMatchObject({ en: 'Fast 8 hours' });
    // the CBC row still follows the provider
    expect(row((await get('/provider/ordering/items?service_kind=lab', lab)).body, 'cbc').accepted_insurance[0].classes).toEqual(expect.arrayContaining(['A', 'VIP']));
  });

  it('4. item rules: price only for an offered mode, no negative price, a class with every insurer, unknown catalogue item', async () => {
    const homeOff = await put('/provider/ordering/items', lab, { service_kind: 'lab', catalog_id: 'vitd', modes: ['facility'], prices: { home: 100, facility: 90 } });
    expect(homeOff.status).toBe(400);
    expect(JSON.stringify(homeOff.body)).toContain('item_mode_not_offered');
    const neg = await put('/provider/ordering/items', lab, { service_kind: 'lab', catalog_id: 'vitd', prices: { facility: -5 } });
    expect(JSON.stringify(neg.body)).toContain('item_price_invalid');
    const noClass = await put('/provider/ordering/items', lab, { service_kind: 'lab', catalog_id: 'vitd', prices: { facility: 90 }, accepted_insurance: [{ company_id: BUPA, active: true }] });
    expect(JSON.stringify(noClass.body)).toContain('item_insurance_classes_required');
    const ghost = await put('/provider/ordering/items', lab, { service_kind: 'lab', catalog_id: 'no-such-test', prices: { facility: 10 } });
    expect(ghost.status).toBe(404);
    expect(JSON.stringify(ghost.body)).toContain('catalog_item_not_found');
    // a facility-only provider cannot offer home for an item either
    await put('/provider/ordering/settings', rad, { modes: ['home', 'facility'], home_fee: 40, home_radius_km: 15 });
    const lab2 = await put('/provider/ordering/settings', providerToken(LAB_OLD, 'lab'), { modes: ['facility'], home_fee: 0, home_radius_km: 5 });
    expect(lab2.status).toBeLessThan(300);
    const homeNotOffered = await put('/provider/ordering/items', providerToken(LAB_OLD, 'lab'), { service_kind: 'lab', catalog_id: 'cbc', prices: { home: 50 } });
    expect(JSON.stringify(homeNotOffered.body)).toContain('item_mode_not_offered');
  });

  it('5. radiology at home only for portable scans', async () => {
    const mri = await put('/provider/ordering/items', rad, { service_kind: 'radiology', catalog_id: 'mri-knee', modes: ['home', 'facility'], prices: { home: 1000, facility: 900 } });
    expect(mri.status).toBe(400);
    expect(JSON.stringify(mri.body)).toContain('home_radiology_portable_only');
    const mriFacility = await put('/provider/ordering/items', rad, { service_kind: 'radiology', catalog_id: 'mri-knee', modes: ['facility'], prices: { facility: 900 } });
    expect(mriFacility.status).toBeLessThan(300);
    const us = await put('/provider/ordering/items', rad, { service_kind: 'radiology', catalog_id: 'us-abd', modes: ['home', 'facility'], prices: { home: 220, facility: 150 } });
    expect(us.status).toBeLessThan(300);
    const rows = (await get('/provider/ordering/items?service_kind=radiology', rad)).body;
    expect(row(rows, 'us-abd').modes).toEqual(expect.arrayContaining(['home', 'facility']));
    expect(row(rows, 'mri-knee').modes).toEqual(['facility']);
  });

  it('6. nursing items use the same model (home mode, price, gender preference comes from the settings)', async () => {
    await put('/provider/ordering/settings', nurse, { modes: ['home'], home_fee: 0, home_radius_km: 20, staff_genders: ['female'] });
    const r = await put('/provider/ordering/items', nurse, { service_kind: 'nursing', catalog_id: 'dressing', prices: { home: 80 } });
    expect(r.status).toBeLessThan(300);
    const rows = (await get('/provider/ordering/items?service_kind=nursing', nurse)).body;
    expect(row(rows, 'dressing')).toMatchObject({ modes: ['home'], prices: { home: 80 } });
  });

  it('7. bulk price, copy mode, CSV export and import', async () => {
    await put('/provider/ordering/items', lab, { service_kind: 'lab', catalog_id: 'vitd', prices: { facility: 100 } });
    const bulk = await post('/provider/ordering/items/bulk-price', lab, { service_kind: 'lab', mode: 'facility', percent: 10 });
    expect(bulk.status).toBeLessThan(300);
    expect(bulk.body.updated).toBeGreaterThanOrEqual(3);
    let rows = (await get('/provider/ordering/items?service_kind=lab', lab)).body;
    expect(row(rows, 'cbc').prices.facility).toBeCloseTo(44, 1); // 40 + 10 %
    expect(row(rows, 'vitd').prices.facility).toBeCloseTo(110, 1);
    const subset = await post('/provider/ordering/items/bulk-price', lab, { service_kind: 'lab', mode: 'facility', set_price: 50, catalog_ids: ['cbc'] });
    expect(subset.body.updated).toBe(1);
    rows = (await get('/provider/ordering/items?service_kind=lab', lab)).body;
    expect(row(rows, 'cbc').prices.facility).toBe(50);
    expect(row(rows, 'vitd').prices.facility).toBeCloseTo(110, 1); // untouched

    const copied = await post('/provider/ordering/items/copy-mode', lab, { service_kind: 'lab', from: 'facility', to: 'home' });
    expect(copied.status).toBeLessThan(300);
    rows = (await get('/provider/ordering/items?service_kind=lab', lab)).body;
    expect(row(rows, 'vitd').prices.home).toBeCloseTo(110, 1); // empty destination filled
    expect(row(rows, 'cbc').prices.home).toBe(55); // an existing destination price is kept

    const csv = await get('/provider/ordering/items/export?service_kind=lab', lab);
    expect(csv.status).toBe(200);
    const text = typeof csv.body === 'string' ? csv.body : csv.body?.csv;
    expect(text.split('\n')[0].trim()).toBe('catalog_id,mode,price');
    expect(text).toContain('cbc,facility,50');

    const imp = await post('/provider/ordering/items/import', lab, { service_kind: 'lab', csv: 'catalog_id,mode,price\ncbc,facility,48\nvitd,facility,-3\nnope,facility,10\nhba1c,home,70\n' });
    expect(imp.status).toBeLessThan(300);
    expect(imp.body.imported).toBe(1);
    expect(imp.body.rejected).toHaveLength(3);
    expect(imp.body.rejected.map((x: any) => x.line)).toEqual(expect.arrayContaining([3, 4, 5]));
    expect(row((await get('/provider/ordering/items?service_kind=lab', lab)).body, 'cbc').prices.facility).toBe(48);
  });

  it('8. completeness score with the owner\'s weights and what is missing', async () => {
    const c = await get('/provider/ordering/completeness', lab);
    expect(c.status).toBe(200);
    expect(c.body.score).toBeGreaterThan(0);
    expect(c.body.score).toBeLessThanOrEqual(100);
    expect(Object.keys(c.body.parts).sort()).toEqual(['insurance', 'modes_hours', 'photo_licence', 'prep_turnaround', 'prices']);
    // an admin editing the weights changes the score (SystemConfig `ordering_completeness_weights`)
    await stack.db.collection('system_configs').updateOne({ key: 'ordering_completeness_weights' }, { $set: { key: 'ordering_completeness_weights', value: { prices: 100, modes_hours: 0, insurance: 0, prep_turnaround: 0, photo_licence: 0 } } }, { upsert: true });
    const reweighted = await get('/provider/ordering/completeness', lab);
    expect(reweighted.body.score).not.toBe(c.body.score);
    await stack.db.collection('system_configs').deleteOne({ key: 'ordering_completeness_weights' });
    // an incomplete provider sees what to add
    const nurseScore = await get('/provider/ordering/completeness', nurse);
    expect(Array.isArray(nurseScore.body.missing)).toBe(true);
  });

  it('9. every ordering write leaves an audit row', async () => {
    const n = await stack.db.collection('audit_logs').countDocuments({ action: /ordering\./, actor_id: LAB });
    expect(n).toBeGreaterThanOrEqual(3);
  });

  it('10. the legacy rows migrate once: home flag → modes, price → both modes, nothing is lost', async () => {
    expect((await post('/admin/ordering/migrate-capabilities', patient, {})).status).toBe(403);
    const first = await post('/admin/ordering/migrate-capabilities', admin, {});
    expect(first.status).toBeLessThan(300);
    expect(first.body.migrated).toBeGreaterThanOrEqual(2);
    const rows = (await get('/provider/ordering/items?service_kind=lab', providerToken(LAB_OLD, 'lab'))).body;
    // LAB_OLD is a facility-only provider since test 4, so a migrated home price is kept as data but home is not offered
    const cbc = row(rows, 'cbc');
    expect(cbc?.prices?.facility).toBe(35);
    const hba1c = row(rows, 'hba1c');
    expect(hba1c).toMatchObject({ modes: ['facility'], prices: { facility: 55 } });
    expect(await stack.db.collection('provider_capabilities_lab').countDocuments({ provider_account_id: LAB_OLD })).toBe(2);
    const second = await post('/admin/ordering/migrate-capabilities', admin, {});
    expect(second.body.migrated).toBe(0);
  });
});
