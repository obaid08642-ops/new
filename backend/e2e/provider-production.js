/* P3 GATE — e2e for the 9 governed provider endpoints (+shifts CRUD completion).
 * Prerequisites: an explicitly provisioned disposable E2E stack, then:
 *   BASE=http://127.0.0.1:4099/api/v1 node e2e/provider-production.js
 * Every scenario asserts REAL persistence (read-back from the API/DB), never mocks.
 */
const axios = require('axios');
const base = process.env.BASE;
const mongoUri = process.env.MONGO_URI;
const e2eDb = process.env.E2E_DB;
const e2eJwtSecret = process.env.E2E_JWT_SECRET;
if (process.env.E2E_ALLOW_DESTRUCTIVE !== 'true') {
  throw new Error('Set E2E_ALLOW_DESTRUCTIVE=true to permit this data-mutating harness.');
}
for (const [name, value] of Object.entries({ BASE: base, MONGO_URI: mongoUri, E2E_DB: e2eDb, E2E_JWT_SECRET: e2eJwtSecret })) {
  if (!value) throw new Error(`Missing required ${name} environment variable.`);
}

const results = [];
async function t(name, fn) {
  try { const r = await fn(); results.push(['PASS', name]); console.log(`PASS  ${name}${r ? ' — ' + r : ''}`); }
  catch (e) {
    const msg = e.response ? `${e.response.status}: ${JSON.stringify(e.response.data).slice(0, 160)}` : e.message;
    results.push(['FAIL', name, msg]); console.log(`FAIL  ${name} — ${msg}`);
  }
}
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
let db;

async function main() {
  const { MongoClient } = require('mongodb');
  const bcrypt = require('bcryptjs');
    const mc = new MongoClient(mongoUri); await mc.connect();
  db = mc.db(e2eDb);
  const now = new Date();
  const pw = bcrypt.hashSync('Test!23456', 4);
  const seedUser = (id, email, role, phone) => db.collection('users').updateOne({ email }, {
    $set: { id, email, full_name: id, role, status: 'active', active: true, phone, password_hash: pw, is_verified: true, createdAt: now },
  }, { upsert: true });

  await seedUser('usr-p3-doctor', 'p3.doctor@test.sa', 'doctor', '+966511110001');
  await seedUser('usr-p3-lab', 'p3.lab@test.sa', 'lab', '+966511110002');
  await seedUser('usr-p3-pharm', 'p3.pharm@test.sa', 'pharmacy', '+966511110003');
  await seedUser('usr-p3-hospital', 'p3.hospital@test.sa', 'hospital', '+966511110004');
  await seedUser('usr-p3-rad', 'p3.rad@test.sa', 'radiology', '+966511110005');
  await seedUser('usr-p3-stranger', 'p3.stranger@test.sa', 'nursing', '+966511110006');
  // Facility linkage for claims ownership (normally set on invitation acceptance).
  await db.collection('users').updateOne({ id: 'usr-p3-hospital' }, { $set: { parent_provider_account_id: 'usr-p3-hospital' } });
  await db.collection('users').updateOne({ email: 'admin@nabdah.sa' }, { $set: { password_hash: bcrypt.hashSync('Adm1n!Pass', 4) } }, { upsert: false });

  // Idempotent cleanup of this harness's prior artifacts (unique indexes).
  await Promise.all([
    db.collection('outbound_referrals').deleteMany({ referral_code: { $in: ['REF-A1', 'REF-B2'] } }),
    db.collection('radiologybookings').deleteMany({ id: { $in: ['rbk-p3-inb', 'rbk-p3-other', 'rbk-p3-cov'] } }),
    db.collection('labbookings').deleteMany({ id: { $in: ['lbk-p3-inb', 'lbk-p3-cov'] } }),
    db.collection('homecarebookings').deleteMany({ id: 'hbk-p3-cov' }),
    db.collection('insurance_claims').deleteMany({ id: 'clm-p3-a' }),
    db.collection('orders').deleteMany({ id: 'ord-p3-ins' }),
  ]);

  const login = async (email) => {
    const r = await axios.post(`${base}/auth/login`, { identifier: email, password: 'Test!23456' });
    return r.data?.token?.accessToken;
  };
  const T = {};
  // One REAL login as an auth sanity check…
  T.doc = await login('p3.doctor@test.sa');
  if (!T.doc) throw new Error('login failed');
  // …then direct-mint the remaining tokens (login route is rate-limited to
  // ~5/min per IP — a harness limit, not a product one).
  const jwt = require('jsonwebtoken');
  const SECRET = e2eJwtSecret;
  const mint = (id, role) => jwt.sign({ sub: id, id, role }, SECRET, { expiresIn: '1h' });
  T.lab = mint('usr-p3-lab', 'lab');
  T.pharm = mint('usr-p3-pharm', 'pharmacy');
  T.hosp = mint('usr-p3-hospital', 'hospital');
  T.rad = mint('usr-p3-rad', 'radiology');
  T.stranger = mint('usr-p3-stranger', 'nursing');

  // ── E1: pharmacy per-item insurance decision ──
  await t('P3-E1a POST /orders/:id/insurance-decision approves/partial per item', async () => {
    const orderId = 'ord-p3-ins';
    await db.collection('orders').updateOne({ id: orderId }, { $set: {
      id: orderId, pharmacy_id: 'usr-p3-pharm', state: 'ACCEPTED',
      total: 100,
      items: [
        { id: 'it1', name: 'Panadol', price: 60, qty: 1 },
        { id: 'it2', name: 'Vitamin', price: 40, qty: 1 },
      ],
      insurance_status: 'pending', createdAt: now,
    } }, { upsert: true });
    const r = await axios.post(`${base}/orders/${orderId}/insurance-decision`, {
      items: [
        { item_id: 'it1', decision: 'approved' },
        { item_id: 'it2', decision: 'rejected', reject_reason: 'not_covered' },
      ],
      copay_percent: 30,
    }, auth(T.pharm));
    if (!r.data?.ok) throw new Error('not ok');
    if (r.data.insurance_status !== 'PARTIAL') throw new Error(`status=${r.data.insurance_status}`);
    // read-back: persisted mirror fields
    const back = await db.collection('orders').findOne({ id: orderId });
    if (back.insurance_details.copay_percent !== 30) throw new Error('copay not persisted');
    const it1 = back.items.find((i) => i.id === 'it1');
    if (it1.isCovered !== true) throw new Error('item approval not persisted');
    const it2 = back.items.find((i) => i.id === 'it2');
    if (it2.isCovered !== false || !it2.rejectReason) throw new Error('item rejection not persisted');
    return `status=${r.data.insurance_status} patient_share=${r.data.patient_share}`;
  });
  await t('P3-E1b foreign pharmacy gets 403 on the same order', async () => {
    try {
      await axios.post(`${base}/orders/ord-p3-ins/insurance-decision`, { items: [{ item_id: 'it1', decision: 'approved' }] }, auth(T.lab));
      throw new Error('should have been forbidden');
    } catch (e) { if (e.response?.status !== 403) throw e; return '403'; }
  });

  // ── E2: labs coverage decision ──
  await t('P3-E2 POST /labs/bookings/:id/coverage-decision → WAITING_COPAY + copay persisted', async () => {
    const bid = 'lbk-p3-cov';
    await db.collection('labbookings').updateOne({ id: bid }, { $set: {
      id: bid, provider_account_id: 'usr-p3-lab', patient_id: 'usr-patient-x',
      state: 'PENDING_INSURANCE', payment_method: 'insurance', total: 200, items: [], createdAt: now,
    } }, { upsert: true });
    const r = await axios.post(`${base}/labs/bookings/${bid}/coverage-decision`, {
      decision: 'APPROVED_PARTIAL', copay_percent: 25,
    }, auth(T.lab));
    if (r.data.next_state !== 'WAITING_COPAY') throw new Error(`state=${r.data.next_state}`);
    if (r.data.copay_amount !== 50) throw new Error(`copay=${r.data.copay_amount}`);
    const back = await db.collection('labbookings').findOne({ id: bid });
    if (back.state !== 'WAITING_COPAY') throw new Error('db state mismatch');
    if (back.insurance_status !== 'partial_approval') throw new Error(`mirror=${back.insurance_status}`);
    if (back.insurance_copay_amount !== 50) throw new Error('copay mirror missing');
    return `next=${r.data.next_state} copay=${r.data.copay_amount}`;
  });
  await t('P3-E2b invalid decision value rejected with 400', async () => {
    try {
      await axios.post(`${base}/labs/bookings/lbk-p3-cov/coverage-decision`, { decision: 'MAYBE' }, auth(T.lab));
      throw new Error('should have been 400');
    } catch (e) { if (e.response?.status !== 400) throw e; return '400'; }
  });

  // ── E3: radiology coverage decision (full approval path) ──
  await t('P3-E3 POST /radiology/bookings/:id/coverage-decision APPROVED_FULL', async () => {
    const bid = 'rbk-p3-cov';
    await db.collection('radiologybookings').updateOne({ id: bid }, { $set: {
      id: bid, provider_account_id: 'usr-p3-rad', patient_id: 'usr-patient-x',
      state: 'PENDING_INSURANCE', payment_method: 'insurance', total: 300, createdAt: now,
    } }, { upsert: true });
    const r = await axios.post(`${base}/radiology/bookings/${bid}/coverage-decision`, {
      decision: 'APPROVED_FULL', approval_code: 'NPH-777',
    }, auth(T.rad));
    if (r.data.next_state !== 'WAITING_COPAY') throw new Error(`state=${r.data.next_state}`);
    if (r.data.copay_amount !== 0) throw new Error('copay must be 0');
    const back = await db.collection('radiologybookings').findOne({ id: bid });
    if (back.insurance_approval_code !== 'NPH-777') throw new Error('approval code lost');
    return 'ok';
  });

  // ── E4: nursing (homecare) coverage decision + rejection reason required ──
  await t('P3-E4 POST /home-care/bookings/:id/coverage-decision REJECTED requires reason', async () => {
    const bid = 'hbk-p3-cov';
    await db.collection('homecarebookings').updateOne({ id: bid }, { $set: {
      id: bid, provider_account_id: 'usr-p3-stranger', patient_id: 'usr-patient-x',
      state: 'PENDING_INSURANCE', payment_method: 'insurance', total: 150, createdAt: now,
    } }, { upsert: true });
    try {
      await axios.post(`${base}/home-care/bookings/${bid}/coverage-decision`, { decision: 'REJECTED' }, auth(T.stranger));
      throw new Error('missing reason should fail');
    } catch (e) { if (e.response?.status !== 400) throw e; }
    const r = await axios.post(`${base}/home-care/bookings/${bid}/coverage-decision`, {
      decision: 'REJECTED', reason: 'خدمة غير مغطاة',
    }, auth(T.stranger));
    if (r.data.insurance_status !== 'REJECTED') throw new Error(`status=${r.data.insurance_status}`);
    const back = await db.collection('homecarebookings').findOne({ id: bid });
    if (back.insurance_rejection_reason !== 'خدمة غير مغطاة') throw new Error('reason lost');
    return 'ok';
  });

  // ── E5/E6: CRM round-trip ──
  await t('P3-E5 POST /provider/crm/:patientId persists tags+notes; GET reads them back', async () => {
    const payload = { tags: ['vip-ish', 'follow-up'], notes: [{ date: '2026-01-01', text: 'يفضل الصباح' }], vip: true, favorite: true };
    const w = await axios.post(`${base}/provider/crm/usr-patient-x`, payload, auth(T.doc));
    if (!w.data.tags.includes('vip-ish')) throw new Error('write failed');
    const g = await axios.get(`${base}/provider/crm/usr-patient-x`, auth(T.doc));
    if (g.data.vip !== true || g.data.notes.length !== 1) throw new Error('roundtrip failed');
    // isolation: another provider must NOT see this CRM
    const other = await axios.get(`${base}/provider/crm/usr-patient-x`, auth(T.lab));
    if ((other.data.tags || []).length !== 0) throw new Error('crm leaked across providers');
    return 'isolated-roundtrip-ok';
  });

  // ── E7: referrals mine ──
  await t('P3-E7 GET /provider/referrals/mine lists only own referrals', async () => {
    await db.collection('outbound_referrals').insertMany([
      { id: 'oref-p3-1', referrer_doctor_id: 'usr-p3-doctor', patient_id: 'px1', referral_code: 'REF-A1', target_type: 'lab', requested_tests: ['CBC'], status: 'pending', createdAt: now },
      { id: 'oref-p3-2', referrer_doctor_id: 'usr-someone-else', patient_id: 'px2', referral_code: 'REF-B2', target_type: 'lab', status: 'pending', createdAt: now },
    ]);
    const r = await axios.get(`${base}/provider/referrals/mine`, auth(T.doc));
    const rows = Array.isArray(r.data) ? r.data : [];
    if (!rows.some((x) => x.target_type === 'lab')) throw new Error('own referral missing');
    if (rows.some((x) => x.id === undefined)) throw new Error('malformed row');
    return `${rows.length} rows`;
  });

  // ── E8: technician roster CRUD ──
  let techId;
  await t('P3-E8 CRUD /hospital/staff-roster/technicians full lifecycle', async () => {
    const c = await axios.post(`${base}/hospital/staff-roster/technicians`, {
      full_name: 'فني تيست', phone: '+966522220001', department: 'سحب منزلي',
    }, auth(T.lab));
    techId = c.data.id;
    if (!techId) throw new Error('no id returned');
    const l = await axios.get(`${base}/hospital/staff-roster/technicians`, auth(T.lab));
    if (!l.data.some((x) => x.id === techId)) throw new Error('list missing created');
    const u = await axios.patch(`${base}/hospital/staff-roster/technicians/${techId}`, { department: 'أشعة' }, auth(T.lab));
    if (u.data.department !== 'أشعة') throw new Error('patch failed');
    // ownership isolation: another lab cannot edit it
    try {
      await axios.patch(`${base}/hospital/staff-roster/technicians/${techId}`, { department: 'hack' }, auth(T.rad));
      throw new Error('foreign update should 403');
    } catch (e) { if (e.response?.status !== 403) throw e; }
    const d = await axios.delete(`${base}/hospital/staff-roster/technicians/${techId}`, auth(T.lab));
    if (!d.data.ok) throw new Error('delete failed');
    const l2 = await axios.get(`${base}/hospital/staff-roster/technicians`, auth(T.lab));
    if (l2.data.some((x) => x.id === techId)) throw new Error('still listed after delete');
    return 'create-list-update-403-delete ok';
  });

  // ── E9: facility shifts full CRUD (existing create + NEW patch/delete) ──
  let shiftId;
  await t('P3-E9 CRUD /facility/shifts — create → PATCH → DELETE', async () => {
    const c = await axios.post(`${base}/facility/shifts`, {
      user_id: 'usr-p3-doctor', start_time: '08:00', end_time: '14:00', day_of_week: 'Sunday',
    }, auth(T.hosp));
    shiftId = c.data?.id || c.data?.shift?.id;
    if (!shiftId) throw new Error('no shift id');
    const u = await axios.patch(`${base}/facility/shifts/${shiftId}`, { end_time: '16:00' }, auth(T.hosp));
    if ((u.data.end_time) !== '16:00') throw new Error(`patch end_time=${u.data.end_time}`);
    // foreign facility cannot edit
    try {
      await axios.patch(`${base}/facility/shifts/${shiftId}`, { end_time: '23:59' }, auth(T.lab));
      throw new Error('foreign patch should 404/403');
    } catch (e) { if (![403, 404].includes(e.response?.status)) throw e; }
    const d = await axios.delete(`${base}/facility/shifts/${shiftId}`, auth(T.hosp));
    if (!d.data.ok) throw new Error('delete failed');
    return 'create-patch-403-delete ok';
  });

  // ── E10: claims actions ──
  await t('P3-E10 POST /claims/:id/{approve,reject,resubmit} real transitions + audit history', async () => {
    const cid = 'clm-p3-a';
    await db.collection('insurance_claims').updateOne({ id: cid }, { $set: {
      id: cid, patient_id: 'usr-patient-x', service: 'استشارة', amount: 250, covered: 200,
      status: 'pending', facility_account_id: 'usr-p3-hospital', createdAt: now,
    } }, { upsert: true });
    // owner facility can act
    const rej = await axios.post(`${base}/claims/${cid}/reject`, { reason: 'مستندات ناقصة' }, auth(T.hosp));
    if (rej.data.claim_status !== 'REJECTED') throw new Error('reject failed');
    const res = await axios.post(`${base}/claims/${cid}/resubmit`, { updated_documents: ['doc1.pdf'] }, auth(T.hosp));
    if (res.data.claim_status !== 'PENDING') throw new Error(`resubmit status=${res.data.claim_status}`);
    const appr = await axios.post(`${base}/claims/${cid}/approve`, {}, auth(T.hosp));
    if (appr.data.claim_status !== 'APPROVED') throw new Error('approve failed');
    const back = await db.collection('insurance_claims').findOne({ id: cid });
    if (!Array.isArray(back.history) || back.history.length < 3) throw new Error('audit history missing');
    // foreign actor cannot touch it
    try {
      await axios.post(`${base}/claims/clm-p3-a/approve`, {}, auth(T.lab));
      throw new Error('foreign approve should 403');
    } catch (e) { if (e.response?.status !== 403) throw e; }
    return 'reject-resubmit-approve-history-403 ok';
  });

  // ── E11: inbound reports ──
  await t('P3-E11 GET /provider/reports/inbound returns real referred results only', async () => {
    await db.collection('radiologybookings').updateOne({ id: 'rbk-p3-inb' }, { $set: {
      id: 'rbk-p3-inb', tracking_id: 'trk-p3-inb', referring_doctor_id: 'usr-p3-doctor', patient_name: 'مريض تيست',
      scan_name_ar: 'أشعة صدر', state: 'REPORT_PUBLISHED', report_pdf_url: '/api/v1/storage/rep1',
      published_at: now, createdAt: now,
    } }, { upsert: true });
    await db.collection('labbookings').updateOne({ id: 'lbk-p3-inb' }, { $set: {
      id: 'lbk-p3-inb', tracking_id: 'trk-lbk-inb', referring_doctor_id: 'usr-p3-doctor', patient_name: 'مريض تيست',
      state: 'REPORTED', items: [{ service_name_en: 'CBC' }],
      reports: [{ id: 'r1', url: 'storage-file-2', uploaded_at: now }], createdAt: now,
    } }, { upsert: true });
    await db.collection('radiologybookings').updateOne({ id: 'rbk-p3-other' }, { $set: {
      id: 'rbk-p3-other', tracking_id: 'trk-p3-other', referring_doctor_id: 'usr-not-mine', state: 'REPORT_PUBLISHED', createdAt: now,
    } }, { upsert: true });
    const r = await axios.get(`${base}/provider/reports/inbound`, auth(T.doc));
    const rows = Array.isArray(r.data) ? r.data : [];
    if (!rows.some((x) => x.booking_id === 'rbk-p3-inb' && x.kind === 'RADIOLOGY')) throw new Error('rad report missing');
    if (!rows.some((x) => x.booking_id === 'lbk-p3-inb' && x.kind === 'LAB')) throw new Error('lab report missing');
    if (rows.some((x) => x.booking_id === 'rbk-p3-other')) throw new Error('leaked another doctor\'s report');
    return `${rows.length} rows scoped`;
  });

  // ── E12: availability round-trip ──
  await t('P3-E12 PATCH /provider/profile/availability round-trips exactly', async () => {
    const patchBody = {
      is_accepting_requests: false,
      instant_available: true,
      vacation_from: '2026-08-01', vacation_to: '2026-08-10',
      weekly_schedule: [{ day: 'sunday', active: true, morning_start: '09:00', morning_end: '13:00' }],
    };
    const p = await axios.patch(`${base}/provider/profile/availability`, patchBody, auth(T.doc));
    if (!p.data.ok) throw new Error('patch not ok');
    const g = await axios.get(`${base}/provider/profile/availability`, auth(T.doc));
    for (const k of ['is_accepting_requests', 'instant_available', 'vacation_from', 'vacation_to']) {
      if (JSON.stringify(g.data[k]) !== JSON.stringify(patchBody[k])) throw new Error(`mismatch:${k}`);
    }
    if (g.data.weekly_schedule?.[0]?.morning_start !== '09:00') throw new Error('schedule mismatch');
    return 'roundtrip exact';
  });

  // ── summary ──
  const fails = results.filter((r) => r[0] === 'FAIL');
  console.log(`\n══ P3 GATE: ${results.length - fails.length}/${results.length} PASS ══`);
  if (fails.length) { console.log(fails.map((f) => `  ✗ ${f[1]} — ${f[2]}`).join('\n')); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
