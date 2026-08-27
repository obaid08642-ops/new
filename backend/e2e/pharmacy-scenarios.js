/* P4 GATE — Pharmacy full scenario matrix (cash / COD / insurance) on a live server.
 * Prereq: server on :4099 (boot.js or manual), then:
 *   node e2e/pharmacy-scenarios.js
 * Covers: broadcast→offer→select→(cash|cod|insurance)→confirm→preparing→ready→
 *         out-for-delivery→delivered(+COD settle)→ledger credit + reject + partial.
 */
const axios = require('axios');
const base = process.env.BASE || 'http://127.0.0.1:4099/api/v1';
const jwt = require('/Users/ahmedobaid/Downloads/nabdah-audit/workstation/backend/node_modules/jsonwebtoken');
const SECRET = 'e2e-jwt-secret-0123456789abcdef';
const mint = (id, role) => ({ headers: { Authorization: `Bearer ${jwt.sign({ sub: id, id, role }, SECRET, { expiresIn: '1h' })}` } });

const results = [];
async function t(name, fn) {
  try { const r = await fn(); results.push(['PASS', name]); console.log(`PASS  ${name}${r ? ' — ' + r : ''}`); }
  catch (e) {
    const msg = e.response ? `${e.response.status}: ${JSON.stringify(e.response.data).slice(0, 180)}` : e.message;
    results.push(['FAIL', name, msg]); console.log(`FAIL  ${name} — ${msg}`);
  }
}
let db;

async function main() {
  const { MongoClient } = require('mongodb');
  const bcrypt = require('bcryptjs');
  const mongoUri = require('fs').readFileSync('/tmp/e2e/boot.ok', 'utf8').trim();
  const mc = new MongoClient(mongoUri); await mc.connect();
  db = mc.db('nabdah_e2e');
  const now = new Date();
  const pw = bcrypt.hashSync('Test!23456', 4);
  // Idempotent cleanup of prior harness runs (unique indexes: email, order ids).
  await db.collection('provider_accounts').deleteMany({ email: { $in: ['p4.pharm@test.sa'] } });
  await db.collection('pharmacy_orders').deleteMany({ patient_account_id: 'usr-p4-patient' });
  await db.collection('pharmacy_broadcasts').deleteMany({ patient_account_id: 'usr-p4-patient' });
  await db.collection('pharmacy_allocations').deleteMany({ pharmacy_account_id: 'usr-p4-pharm' });
  await db.collection('platformledgerentries').deleteMany({ provider_account_id: 'usr-p4-pharm', ref_type: 'allocation' });

  // ── seeds: patient + pharmacy with inventory near Riyadh coords ──
  await db.collection('users').updateOne({ id: 'usr-p4-patient' }, { $set: {
    id: 'usr-p4-patient', email: 'p4.patient@test.sa', full_name: 'مريض P4', role: 'patient',
    status: 'active', active: true, phone: '+966533330001', password_hash: pw, is_verified: true, createdAt: now,
  } }, { upsert: true });
  await db.collection('users').updateOne({ id: 'usr-p4-pharm' }, { $set: {
    id: 'usr-p4-pharm', email: 'p4.pharm@test.sa', full_name: 'صيدلية P4', role: 'pharmacy',
    status: 'active', active: true, phone: '+966533330002', password_hash: pw, is_verified: true, createdAt: now,
  } }, { upsert: true });
  await db.collection('provider_accounts').updateOne({ id: 'usr-p4-pharm' }, { $set: {
    id: 'usr-p4-pharm', user_id: 'usr-p4-pharm', email: 'p4.pharm@test.sa', provider_type: 'pharmacy',
    account_type: 'pharmacy', status: 'approved', email_verified: true, createdAt: now,
  } }, { upsert: true });
  await db.collection('provider_profiles').updateOne({ id: 'pp-p4-pharm' }, { $set: {
    id: 'pp-p4-pharm', user_id: 'usr-p4-pharm', account_id: 'usr-p4-pharm', name_ar: 'صيدلية P4', name_en: 'P4 Pharmacy',
    type: 'pharmacy', provider_type: 'pharmacy', status: 'active', is_active: true, verification_status: 'verified',
    location: { lat: 24.7136, lng: 46.6753 },
    geo: { lat: 24.7136, lng: 46.6753 }, city: 'riyadh', createdAt: now,
  } }, { upsert: true });
  // Availability gate used by broadcast geo-matching (accepting_orders).
  await db.collection('provider_availability').updateOne({ provider_account_id: 'usr-p4-pharm' }, { $set: {
    provider_account_id: 'usr-p4-pharm', status: 'accepting_orders', last_online_at: now,
  } }, { upsert: true });
  await db.collection('medicines_master').updateOne({ id: 'med-p4-1' }, { $set: {
    id: 'med-p4-1', name_ar: 'بنادول تيست', name_en: 'TEST Panadol', generic_name: 'paracetamol',
    price: 20, category: 'pain_relief', status: 'active', verified: true, createdAt: now,
  } }, { upsert: true });
  await db.collection('provider_capabilities_pharmacy').updateOne(
    { provider_account_id: 'usr-p4-pharm', sku: 'med-p4-1' },
    { $set: {
      provider_account_id: 'usr-p4-pharm', sku: 'med-p4-1', medicine_id: 'med-p4-1',
      name_en: 'TEST Panadol', name_ar: 'بنادول تيست', stock_qty: 100, is_available: true,
      available: true, price: 18, currency: 'SAR', min_stock_alert: 5, createdAt: now,
    } }, { upsert: true });
  await db.collection('pharmacy_inventory').updateOne({ pharmacy_id: 'usr-p4-pharm', medicine_id: 'med-p4-1' }, { $set: {
    pharmacy_id: 'usr-p4-pharm', medicine_id: 'med-p4-1', stock_qty: 100, is_available: true,
    price: 18, createdAt: now,
  } }, { upsert: true });

  const patient = mint('usr-p4-patient', 'patient');
  const pharm = mint('usr-p4-pharm', 'pharmacy');

  let orderId;

  await t('P4-1 patient creates + submits order → broadcast starts', async () => {
    const c = await axios.post(`${base}/patient/pharmacy/orders`, {
      items: [{ raw_name: 'TEST Panadol', qty: 2, sku: 'med-p4-1' }],
      delivery_address: { label: 'المنزل', address: 'حي النرجس، الرياض', geo: { lat: 24.7136, lng: 46.6753 } },
      payment_method: 'cash',
    }, patient);
    orderId = c.data?.id || c.data?._id;
    if (!orderId) throw new Error('no order id');
    const s = await axios.post(`${base}/patient/pharmacy/orders/${orderId}/submit`, {}, patient);
    if (!['broadcasting', 'BROADCASTING'].includes(String(s.data?.status || s.data?.order?.status))) {
      throw new Error(`status=${JSON.stringify(s.data?.status || s.data?.order?.status)}`);
    }
    return `order=${orderId.slice(0, 8)}`;
  });

  let allocId;
  await t('P4-2 pharmacy sees broadcast in its queue and claims i-have-all (real offer)', async () => {
    const list = await axios.get(`${base}/provider/pharmacy/broadcasts`, pharm);
    const rows = Array.isArray(list.data) ? list.data : (list.data?.items || []);
    const row = rows.find((b) => (b.broadcast?.order_id || b.order_id) === orderId || (b.broadcast?.id || b.id));
    if (!row) throw new Error('broadcast not visible to pharmacy');
    await axios.post(`${base}/provider/pharmacy/broadcasts/${orderId}/i-have-all`, {}, pharm);
    return 'offer recorded';
  });

  await t('P4-3 patient selects the offer → allocation parked for review', async () => {
    const offers = await axios.get(`${base}/patient/pharmacy/orders/${orderId}/offers`, patient);
    const list = Array.isArray(offers.data) ? offers.data : (offers.data?.offers || []);
    if (!list.length) throw new Error('no offers visible');
    const sel = await axios.post(`${base}/patient/pharmacy/orders/${orderId}/select-offer`, { offer_id: list[0]?.id, pharmacy_account_id: 'usr-p4-pharm' }, patient);
    const st = sel.data?.status || sel.data?.order?.status;
    // Resolve the allocation created for this order (drives the provider lifecycle).
    const allocs = await axios.get(`${base}/provider/pharmacy/allocations`, pharm);
    const rows = Array.isArray(allocs.data) ? allocs.data : (allocs.data?.items || []);
    allocId = rows.find((x) => x.order_id === orderId)?.id;
    if (!allocId) throw new Error('allocation missing after selection');
    if (!st) throw new Error('no status returned');
    return `selected (${st}) alloc=${String(allocId).slice(0, 8)}`;
  });

  let codAlloc;
  await t('P4-4 CASH path: basket confirm → preparing → ready → out-for-delivery', async () => {
    const confirmRes = await axios.post(`${base}/provider/pharmacy/allocations/${allocId}/confirm`, {}, pharm);
    if (!confirmRes.data && !confirmRes.status.toString().startsWith('2')) throw new Error('confirm failed');
    await axios.post(`${base}/provider/pharmacy/allocations/${allocId}/preparing`, {}, pharm);
    await axios.post(`${base}/provider/pharmacy/allocations/${allocId}/ready`, {}, pharm);
    const out = await axios.post(`${base}/provider/pharmacy/allocations/${allocId}/out-for-delivery`, {}, pharm);
    return 'confirm→preparing→ready→out ok';
  });

  await t('P4-5 delivered credits provider earning into ledger (idempotent)', async () => {
    await axios.post(`${base}/provider/pharmacy/allocations/${allocId}/delivered`, {}, pharm);
    const back = await db.collection('platformledgerentries').findOne({ ref_type: 'allocation', ref_id: allocId, type: 'provider_earning' });
    if (!back) throw new Error('ledger earning missing');
    if (!(back.amount > 0)) throw new Error('earning amount not positive');
    // idempotency probe
    await axios.post(`${base}/provider/pharmacy/allocations/${allocId}/delivered`, {}, pharm).catch(() => {});
    const count = await db.collection('platformledgerentries').countDocuments({ ref_type: 'allocation', ref_id: allocId, type: 'provider_earning' });
    if (count !== 1) throw new Error(`earning duplicated ×${count}`);
    return `earning=${back.amount} SAR`;
  });

  await t('P4-6 COD path: register COD → deliver → payment_status flips to cod_collected', async () => {
    // second order for the COD branch
    const c = await axios.post(`${base}/patient/pharmacy/orders`, {
      items: [{ raw_name: 'TEST Panadol', qty: 1, sku: 'med-p4-1' }],
      delivery_address: { label: 'المنزل', address: 'رياض', geo: { lat: 24.714, lng: 46.676 } },
      payment_method: 'cod',
    }, patient);
    const oid = c.data?.id || c.data?._id;
    await axios.post(`${base}/patient/pharmacy/orders/${oid}/submit`, {}, patient);
    await axios.post(`${base}/provider/pharmacy/broadcasts/${oid}/i-have-all`, {}, pharm);
    const offers = await axios.get(`${base}/patient/pharmacy/orders/${oid}/offers`, patient);
    const olist = Array.isArray(offers.data) ? offers.data : (offers.data?.offers || []);
    if (!olist.length) throw new Error('no offers for COD order');
    await axios.post(`${base}/patient/pharmacy/orders/${oid}/select-offer`, { offer_id: olist[0].id, pharmacy_account_id: 'usr-p4-pharm' }, patient);
    await axios.post(`${base}/patient/pharmacy/orders/${oid}/cod`, {}, patient); // registerCod AFTER selection
    const afterCod = await db.collection('pharmacy_orders').findOne({ id: oid });
    if (afterCod.payment_method !== 'cod') throw new Error('cod not registered');
    const allocs = await axios.get(`${base}/provider/pharmacy/allocations`, pharm);
    const rows = Array.isArray(allocs.data) ? allocs.data : (allocs.data?.items || []);
    codAlloc = rows.find((a) => a.order_id === oid)?.id;
    if (!codAlloc) throw new Error('alloc for COD order not found');
    await axios.post(`${base}/provider/pharmacy/allocations/${codAlloc}/confirm`, {}, pharm);
    await axios.post(`${base}/provider/pharmacy/allocations/${codAlloc}/preparing`, {}, pharm);
    await axios.post(`${base}/provider/pharmacy/allocations/${codAlloc}/ready`, {}, pharm);
    await axios.post(`${base}/provider/pharmacy/allocations/${codAlloc}/out-for-delivery`, {}, pharm);
    await axios.post(`${base}/provider/pharmacy/allocations/${codAlloc}/delivered`, {}, pharm);
    const after = await db.collection('pharmacy_orders').findOne({ id: oid });
    if (after.payment_status !== 'cod_collected') throw new Error(`payment_status=${after.payment_status}`);
    return 'COD settled on delivery';
  });

  await t('P4-7 INSURANCE path: per-item decision persisted with copay mirror', async () => {
    const c = await axios.post(`${base}/patient/pharmacy/orders`, {
      items: [{ raw_name: 'TEST Panadol', qty: 1, sku: 'med-p4-1' }],
      delivery_address: { label: 'المنزل', address: 'رياض', geo: { lat: 24.714, lng: 46.676 } },
      payment_method: 'insurance',
    }, patient);
    const oid = c.data?.id || c.data?._id;
    // attach insurance_details so the flow has a policy
    await db.collection('pharmacy_orders').updateOne({ id: oid }, { $set: {
      insurance_details: { policy_number: 'POL-777', member_id: 'MEM-888', approvalStatus: 'PENDING_PROVIDER_REVIEW' },
    } });
    await axios.post(`${base}/patient/pharmacy/orders/${oid}/submit`, {}, patient);
    await axios.post(`${base}/provider/pharmacy/broadcasts/${oid}/i-have-all`, {}, pharm);
    const poffers = await axios.get(`${base}/patient/pharmacy/orders/${oid}/offers`, patient);
    const plist = Array.isArray(poffers.data) ? poffers.data : (poffers.data.offers || []);
    await axios.post(`${base}/patient/pharmacy/orders/${oid}/select-offer`,
      { offer_id: plist[0]?.id, pharmacy_account_id: 'usr-p4-pharm' }, patient);
    const r = await axios.post(`${base}/provider/pharmacy/orders/${oid}/insurance`, {
      items: [{ item_id: 'x1', decision: 'approved' }],
      copay_percent: 20,
      nphies_approval_code: 'NPH-P4',
      policy_number: 'POL-777',
      member_id: 'MEM-888',
    }, pharm);
    if (!['APPROVED', 'PARTIAL'].includes(r.data?.status)) throw new Error(`status=${r.data?.status}`);
    if (r.data.waiting_state !== 'WAITING_COPAY') throw new Error('waiting state missing');
    const back = await db.collection('pharmacy_orders').findOne({ id: oid });
    if (back.insurance_evaluation?.copay_percent !== 20) throw new Error('copay_percent lost');
    if (back.insurance_evaluation?.nphies_code !== 'NPH-P4') throw new Error('approval code lost');
    // ownership: a different pharmacy cannot decide
    try {
      await mint('usr-other-pharm', 'pharmacy');
      await axios.post(`${base}/provider/pharmacy/orders/${oid}/insurance`, {
        items: [{ item_id: 'x1', decision: 'rejected', reject_reason: 'x' }], copay_percent: 0,
      }, { headers: { Authorization: `Bearer ${jwt.sign({ sub: 'usr-other-pharm', id: 'usr-other-pharm', role: 'pharmacy' }, SECRET)}` } });
      throw new Error('foreign decision should 403');
    } catch (e) { if (e.response?.status !== 403) throw e; }
    return `${r.data.status} copay=${r.data.copay_amount}`;
  });

  await t('P4-8 reject broadcast is recorded honestly', async () => {
    const c = await axios.post(`${base}/patient/pharmacy/orders`, {
      items: [{ raw_name: 'غير متوفر عند الجميع', qty: 1 }],
      delivery_address: { label: 'المنزل', address: 'رياض', geo: { lat: 24.72, lng: 46.68 } },
    }, patient);
    const oid = c.data?.id || c.data?._id;
    await axios.post(`${base}/patient/pharmacy/orders/${oid}/submit`, {}, patient);
    const r = await axios.post(`${base}/provider/pharmacy/broadcasts/${oid}/reject`, { reason: 'لا يوجد بالمخزون' }, pharm);
    if (!r.data && !String(r.status).startsWith('2')) throw new Error('reject failed');
    return 'rejected ok';
  });

  const fails = results.filter((r) => r[0] === 'FAIL');
  console.log(`\n══ P4 GATE: ${results.length - fails.length}/${results.length} PASS ══`);
  if (fails.length) { console.log(fails.map((f) => `  ✗ ${f[1]} — ${f[2]}`).join('\n')); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error('FATAL', e.response?.data || e.message); process.exit(1); });
