/* Nabdah Plus — deep lifecycle matrix: real TEST providers in every vertical,
   full patient→provider→completion journeys, edge cases, and the admin approval chain.
   Complements matrix.js (65 scenario breadth) with end-to-end vertical depth. */
const axios = require('axios');
const fs = require('fs');
const base = 'http://127.0.0.1:4099/api/v1';

const results = [];
const skip = [];
async function t(name, fn) {
  try { const r = await fn(); results.push(['PASS', name, r ?? '']); console.log(`PASS  ${name}${r ? ' — ' + r : ''}`); }
  catch (e) {
    if (e && e.skipped) { skip.push(name); console.log(`SKIP  ${name} — ${e.skipped}`); }
    else { const msg = e.response ? `${e.response.status}: ${JSON.stringify(e.response.data).slice(0, 160)}` : e.message; results.push(['FAIL', name, msg]); console.log(`FAIL  ${name} — ${msg}`); }
  }
}
function doSkip(reason) { const e = new Error(reason); e.skipped = reason; throw e; }
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
function future(days, hour = 12) {
  const d = new Date(Date.now() + days * 86400000);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}
const httpStatus = (p) => p.then((r) => r.status).catch((e) => e.response?.status ?? 0);

const U = {};   // tokens/ids: patient, stranger, admin, lab, rad, nurse, pharm, doctor, driver, newdoc
const K = {};   // created entities
let db;

async function main() {
  // ══ SEED: TEST providers in every vertical + catalogs (direct mongo) ══
  const { MongoClient } = require('mongodb');
  const bcrypt = require('bcryptjs');
  const mongoUri = fs.readFileSync('/tmp/e2e/boot.ok', 'utf8').trim();
  const mc = new MongoClient(mongoUri); await mc.connect();
  db = mc.db('nabdah_e2e');
  const now = new Date();
  const pw = bcrypt.hashSync('Test!23456', 4);
  const seedUser = (id, email, role, name, phone, passHash = pw) => db.collection('users').updateOne({ email }, { $set: {
    id, email, full_name: name, role, status: 'active', active: true, phone,
    password_hash: passHash, is_verified: true, createdAt: now, updatedAt: now,
  } }, { upsert: true });

  await seedUser('usr-test-lab', 'test.lab@nabdah.sa', 'lab', 'TEST Laboratory', '+966500001001');
  await seedUser('usr-test-rad', 'test.radiology@nabdah.sa', 'radiology', 'TEST Radiology Center', '+966500001002');
  await seedUser('usr-test-nurse', 'test.nurse@nabdah.sa', 'nursing', 'TEST Nurse', '+966500001003');
  await seedUser('usr-test-pharm', 'test.pharmacy@nabdah.sa', 'pharmacy', 'TEST Pharmacy', '+966500001004');
  await seedUser('usr-test-doctor', 'test.doctor@nabdah.sa', 'doctor', 'TEST Doctor', '+966500001005');
  await seedUser('usr-test-driver', 'test.driver@nabdah.sa', 'delivery', 'TEST Driver', '+966500001006');
  await seedUser('usr-admin-e2e', 'admin@nabdah.sa', 'admin', 'E2E Admin', '+966500000999', bcrypt.hashSync('Adm1n!Pass', 4));

  const seedAccount = (id, userId, email, ptype) => db.collection('provider_accounts').updateOne({ id }, { $set: {
    id, user_id: userId, email, provider_type: ptype, account_type: ptype, status: 'approved',
    email_verified: true, createdAt: now, updatedAt: now,
  } }, { upsert: true });
  await seedAccount('pa-test-lab', 'usr-test-lab', 'test.lab@nabdah.sa', 'laboratory');
  await seedAccount('pa-test-rad', 'usr-test-rad', 'test.radiology@nabdah.sa', 'radiology');
  await seedAccount('pa-test-nurse', 'usr-test-nurse', 'test.nurse@nabdah.sa', 'nursing');
  await seedAccount('pa-test-pharm', 'usr-test-pharm', 'test.pharmacy@nabdah.sa', 'pharmacy');
  await seedAccount('pa-test-doctor', 'usr-test-doctor', 'test.doctor@nabdah.sa', 'doctor');

  // Catalogs
  await db.collection('labservices').updateOne({ id: 'test-lab-svc-cbc' }, { $set: {
    id: 'test-lab-svc-cbc', name_ar: 'تحليل صورة دم كاملة — تيست', name_en: 'TEST CBC', price: 50,
    category: 'hematology', sample_type: 'blood', fasting_required: false, home_visit_supported: true,
    active: true, status: 'active', createdAt: now, updatedAt: now,
  } }, { upsert: true });
  await db.collection('labservices').updateOne({ id: 'test-lab-svc-glu' }, { $set: {
    id: 'test-lab-svc-glu', name_ar: 'تحليل سكر صائم — تيست', name_en: 'TEST Glucose', price: 30,
    category: 'biochemistry', sample_type: 'blood', fasting_required: true, home_visit_supported: true,
    active: true, status: 'active', createdAt: now, updatedAt: now,
  } }, { upsert: true });
  await db.collection('radiologyservices').updateOne({ id: 'test-rad-svc-xray' }, { $set: {
    id: 'test-rad-svc-xray', name_ar: 'أشعة سينية للصدر — تيست', name_en: 'TEST Chest X-Ray', price: 120,
    category: 'xray', active: true, is_deleted: false, createdAt: now, updatedAt: now,
  } }, { upsert: true });
  await db.collection('homecareservices').updateOne({ id: 'test-hc-svc-1' }, { $set: {
    id: 'test-hc-svc-1', name_ar: 'زيارة تمريض منزلي — تيست', name_en: 'TEST Home Nursing Visit', price: 200,
    duration: 'hour', category: 'nursing', active: true, createdAt: now, updatedAt: now,
  } }, { upsert: true });
  await db.collection('medicines_master').updateOne({ id: 'test-med-1' }, { $set: {
    id: 'test-med-1', name_ar: 'باراسيتامول 500 — تيست', name_en: 'TEST Paracetamol 500', generic_name: 'paracetamol',
    price: 25, category: 'pain_relief', status: 'active', verified: true, createdAt: now, updatedAt: now,
  } }, { upsert: true });

  // Pharmacy geo profile (dispatch matching) + inventory + nurse public profile (reviews target)
  await db.collection('provider_profiles').updateOne({ id: 'pp-test-pharm' }, { $set: {
    id: 'pp-test-pharm', user_id: 'usr-test-pharm', account_id: 'pa-test-pharm', name_ar: 'صيدلية تيست', name_en: 'TEST Pharmacy',
    type: 'pharmacy', status: 'active', is_active: true, verification_status: 'verified',
    location: { lat: 24.7136, lng: 46.6753 }, city: 'riyadh', createdAt: now, updatedAt: now,
  } }, { upsert: true });
  await db.collection('provider_profiles').updateOne({ id: 'pp-test-nurse' }, { $set: {
    id: 'pp-test-nurse', user_id: 'usr-test-nurse', account_id: 'pa-test-nurse', name_ar: 'ممرض تيست', name_en: 'TEST Nurse',
    type: 'home_care', status: 'active', is_active: true, verification_status: 'verified',
    location: { lat: 24.7136, lng: 46.6753 }, city: 'riyadh', createdAt: now, updatedAt: now,
  } }, { upsert: true });
  await db.collection('pharmacy_inventory').updateOne({ pharmacy_id: 'usr-test-pharm', medicine_id: 'test-med-1' }, { $set: {
    pharmacy_id: 'usr-test-pharm', medicine_id: 'test-med-1', stock_qty: 50, is_available: true,
    createdAt: now, updatedAt: now,
  } }, { upsert: true });

  await t('S seeds: TEST providers + catalogs in every vertical', async () => 'lab/rad/nurse/pharm/doctor/driver + 4 catalogs + inventory');

  // ══ AUTH ══
  await t('S0 patient + stranger register', async () => {
    const r = await axios.post(`${base}/auth/register`, { full_name: 'مريض دورة الحياة', email: 'mx2.patient@test.sa', password: 'Str0ng!Pass', role: 'patient' });
    U.patient = { token: r.data?.token?.accessToken, id: r.data?.user?.id };
    if (!U.patient.token) throw new Error('no patient token');
    const r2 = await axios.post(`${base}/auth/register`, { full_name: 'غريب', email: 'mx2.stranger@test.sa', password: 'Str0ng!Pass', role: 'patient' });
    U.stranger = { token: r2.data?.token?.accessToken, id: r2.data?.user?.id };
    if (!U.stranger.token) throw new Error('no stranger token');
    return '2 patients';
  });

  await t('S1 admin login (2FA via log OTP)', async () => {
    const r = await axios.post(`${base}/auth/login`, { identifier: 'admin@nabdah.sa', password: 'Adm1n!Pass' });
    if (r.data?.token?.accessToken) { U.admin = { token: r.data.token.accessToken }; return 'direct'; }
    if (!r.data?.requires_2fa) throw new Error('unexpected login shape: ' + JSON.stringify(r.data).slice(0, 120));
    let code = null;
    for (let i = 0; i < 15 && !code; i++) {
      await new Promise((r2) => setTimeout(r2, 1000));
      const logs = fs.existsSync('/tmp/e2e/backend.log') ? fs.readFileSync('/tmp/e2e/backend.log', 'utf8') : '';
      const all = [...logs.matchAll(/OTP for \+966500000999 is (\d{6})/g)];
      if (all.length) code = all[all.length - 1][1]; // freshest code (matrix.js may have logged earlier ones)
    }
    if (!code) throw new Error('admin OTP not found in backend log');
    const v = await axios.post(`${base}/auth/login/verify-2fa`, { identifier: '+966500000999', code });
    U.admin = { token: v.data?.token?.accessToken };
    if (!U.admin.token) throw new Error('no admin token after 2fa');
    return '2fa-ok';
  });

  await t('S2 all TEST providers + driver login', async () => {
    const login = async (key, email) => {
      const r = await axios.post(`${base}/auth/login`, { identifier: email, password: 'Test!23456' });
      U[key] = { token: r.data?.token?.accessToken, id: r.data?.user?.id };
      if (!U[key].token) throw new Error(`no token for ${email}`);
    };
    await login('lab', 'test.lab@nabdah.sa');
    await login('rad', 'test.radiology@nabdah.sa');
    await login('nurse', 'test.nurse@nabdah.sa');
    await login('pharm', 'test.pharmacy@nabdah.sa');
    await login('doctor', 'test.doctor@nabdah.sa');
    await login('driver', 'test.driver@nabdah.sa');
    if (U.lab.id !== 'usr-test-lab' || U.pharm.id !== 'usr-test-pharm') throw new Error('seeded ids not mapped: lab=' + U.lab.id);
    return '6 roles';
  });

  // ══ V. REAL PROVIDER ONBOARDING CHAIN (register → verify → profile → KYC → bank → submit → admin approve) ══
  await t('V1 provider register (doctor) returns required docs', async () => {
    const r = await axios.post(`${base}/provider/auth/register`, {
      email: 'test.newdoc@nabdah.sa', password: 'Test!23456', confirm_password: 'Test!23456', provider_type: 'doctor',
    });
    K.newdocAccount = r.data?.account?.id;
    const req = r.data?.required_documents || [];
    if (!K.newdocAccount) throw new Error('no account id');
    if (req.length !== 4) throw new Error('expected 4 required docs, got ' + req.length);
    return `account=${K.newdocAccount} docs=[${req.join(',')}]`;
  });

  await t('V2 verify-email via LOG_ONLY OTP', async () => {
    let code = null;
    for (let i = 0; i < 12 && !code; i++) {
      await new Promise((r2) => setTimeout(r2, 1000));
      const logs = fs.existsSync('/tmp/e2e/backend.log') ? fs.readFileSync('/tmp/e2e/backend.log', 'utf8') : '';
      const line = logs.split('\n').filter((l) => l.includes('test.newdoc@nabdah.sa') && l.includes('email_verification')).pop();
      const m2 = line && line.match(/(\d{6})/);
      if (m2) code = m2[1];
    }
    if (!code) throw new Error('provider OTP not found in backend log');
    const r = await axios.post(`${base}/provider/auth/verify-email`, { email: 'test.newdoc@nabdah.sa', code });
    if (r.status >= 400) throw new Error('verify failed');
    return 'email verified';
  });

  await t('V3 provider login', async () => {
    const r = await axios.post(`${base}/provider/auth/login`, { email: 'test.newdoc@nabdah.sa', password: 'Test!23456' });
    U.newdoc = { token: r.data?.access_token, id: K.newdocAccount };
    if (!U.newdoc.token) throw new Error('no access_token');
  });

  await t('V4 profile + phone', async () => {
    await axios.patch(`${base}/provider/profile`, { display_name_ar: 'د. تيست الجديد', address: { city: 'riyadh' } }, auth(U.newdoc.token));
    await axios.post(`${base}/provider/profile/phones`, { type: 'mobile', number: '500001010' }, auth(U.newdoc.token));
    const p = await axios.get(`${base}/provider/profile`, auth(U.newdoc.token));
    if (!p.data?.display_name_ar) throw new Error('display_name_ar not saved');
    if (!(p.data?.phones || []).length) throw new Error('phone not saved');
  });

  await t('V5 upload 4 KYC documents (storage real upload)', async () => {
    const pdfB64 = Buffer.from('%PDF-1.4 e2e kyc document').toString('base64');
    for (const dt of ['national_id', 'medical_license', 'professional_cv', 'iban_letter']) {
      await axios.post(`${base}/provider/kyc/documents`, { doc_type: dt, file: { data_base64: pdfB64, mime: 'application/pdf', original_name: dt + '.pdf' } }, auth(U.newdoc.token));
    }
    const docs = await axios.get(`${base}/provider/kyc/documents`, auth(U.newdoc.token));
    const list = docs.data?.documents || (Array.isArray(docs.data) ? docs.data : docs.data?.data) || [];
    if (list.length < 4) throw new Error('expected 4 docs, got ' + list.length);
    if ((docs.data?.missing || []).length !== 0) throw new Error('missing=' + JSON.stringify(docs.data.missing));
    return '4 docs, 0 missing';
  });

  await t('V6 bank account (bank_code from /provider/banks)', async () => {
    const banks = await axios.get(`${base}/provider/banks`);
    const list = Array.isArray(banks.data) ? banks.data : banks.data?.data || banks.data?.banks || [];
    if (!list.length) throw new Error('banks list empty');
    const bank_code = list[0].code;
    await axios.post(`${base}/provider/bank-account`, { bank_code, holder_name: 'TEST New Doctor', iban: 'SA0380000000608010167519' }, auth(U.newdoc.token));
    const b = await axios.get(`${base}/provider/bank-account`, auth(U.newdoc.token));
    if (!b.data?.iban) throw new Error('iban not saved');
    return `bank=${bank_code}`;
  });

  await t('V7 submit for approval → pending_admin_approval', async () => {
    const r = await axios.post(`${base}/provider/onboarding/submit`, {}, auth(U.newdoc.token));
    const status = r.data?.account?.status || r.data?.status;
    if (status !== 'pending_admin_approval') throw new Error('status=' + status);
  });

  await t('V8 admin sees + approves the new provider', async () => {
    const l = await axios.get(`${base}/admin/providers?status=pending_admin_approval`, auth(U.admin.token));
    const list = Array.isArray(l.data) ? l.data : l.data?.data || l.data?.items || [];
    const found = list.find((a) => a.id === K.newdocAccount || a.email === 'test.newdoc@nabdah.sa');
    if (!found) throw new Error('not in pending list (' + list.length + ' rows)');
    await axios.post(`${base}/admin/providers/${K.newdocAccount}/approve`, {}, auth(U.admin.token));
    const me = await axios.get(`${base}/provider/auth/me`, auth(U.newdoc.token));
    const st = me.data?.account?.status || me.data?.status;
    if (st !== 'approved') throw new Error('status after approve=' + st);
    return 'approved end-to-end';
  });

  // ══ L. LABS — full lifecycle ══
  await t('L1 patient books lab (facility/card)', async () => {
    const r = await axios.post(`${base}/labs/bookings`, {
      items: [{ service_id: 'test-lab-svc-cbc', qty: 1 }],
      scheduled_at: future(3, 10), provider_account_id: 'usr-test-lab',
      payment_method: 'card', location_type: 'facility',
      contact: { name: 'مريض دورة الحياة', phone: '+966500009001' },
    }, auth(U.patient.token));
    K.lab = r.data;
    if (!K.lab?.id) throw new Error('no booking id');
    if (K.lab.state !== 'NEW_REQUEST') throw new Error('state=' + K.lab.state);
    if (K.lab.total !== 50) throw new Error('total=' + K.lab.total);
    return `total=${K.lab.total}`;
  });

  await t('L2 lab provider inbox shows the booking', async () => {
    const r = await axios.get(`${base}/labs/provider/inbox`, auth(U.lab.token));
    const found = (r.data || []).find((b) => b.id === K.lab.id);
    if (!found) throw new Error('not in inbox');
  });

  await t('L3 lab confirms (NEW_REQUEST → CONFIRMED)', async () => {
    const r = await axios.patch(`${base}/labs/bookings/${K.lab.id}/state`, { state: 'CONFIRMED' }, auth(U.lab.token));
    const st = r.data?.state || r.data?.data?.state;
    if (st !== 'CONFIRMED') throw new Error('state=' + st);
  });

  await t('L4 invalid transition blocked (CONFIRMED → RESULT_UPLOADED)', async () => {
    const s = await httpStatus(axios.patch(`${base}/labs/bookings/${K.lab.id}/state`, { state: 'RESULT_UPLOADED' }, auth(U.lab.token)));
    if (s !== 400) throw new Error('expected 400, got ' + s);
    return '400';
  });

  await t('L5 patient cannot transition (role guard)', async () => {
    const s = await httpStatus(axios.patch(`${base}/labs/bookings/${K.lab.id}/state`, { state: 'SAMPLE_COLLECTED' }, auth(U.patient.token)));
    if (s !== 403 && s !== 401) throw new Error('expected 403, got ' + s);
    return String(s);
  });

  await t('L6 walk the pipeline to RESULT_UPLOADED', async () => {
    for (const st of ['SAMPLE_COLLECTED', 'PROCESSING', 'RESULT_UPLOADED']) {
      const r = await axios.patch(`${base}/labs/bookings/${K.lab.id}/state`, { state: st }, auth(U.lab.token));
      const got = r.data?.state || r.data?.data?.state;
      if (got !== st) throw new Error(`expected ${st}, got ${got}`);
    }
    return 'SAMPLE_COLLECTED→PROCESSING→RESULT_UPLOADED';
  });

  await t('L7 upload-report (structuredData → real PDF) → REPORTED', async () => {
    const r = await axios.post(`${base}/labs/bookings/${K.lab.id}/upload-report`, {
      structuredData: [
        { test: 'Hemoglobin', result: '13.5', unit: 'g/dL', range: '12-16' },
        { test: 'WBC', result: '7.2', unit: '10^9/L', range: '4-11' },
      ], name: 'cbc_report.pdf',
    }, auth(U.lab.token));
    const b = r.data?.state ? r.data : r.data?.data;
    if (b?.state !== 'REPORTED') throw new Error('state=' + b?.state);
    const rep = (b.reports || [])[0];
    if (!rep?.base64 || rep.base64.length < 200) throw new Error('report pdf missing/too small');
    return `pdf=${rep.base64.length}b`;
  });

  await t('L8 patient sees report; stranger blocked', async () => {
    const mine = await axios.get(`${base}/labs/bookings/mine`, auth(U.patient.token));
    const found = (mine.data || []).find((b) => b.id === K.lab.id);
    if (!found || found.state !== 'REPORTED') throw new Error('not REPORTED in mine');
    const s = await httpStatus(axios.get(`${base}/labs/bookings/${K.lab.id}`, auth(U.stranger.token)));
    if (s !== 404 && s !== 403) throw new Error('stranger got ' + s);
    return 'owner ok, stranger ' + s;
  });

  await t('L9 insurance+home requires doctor_request/preauth', async () => {
    const s = await httpStatus(axios.post(`${base}/labs/bookings`, {
      items: [{ service_id: 'test-lab-svc-cbc', qty: 1 }], scheduled_at: future(4, 10),
      provider_account_id: 'usr-test-lab', payment_method: 'insurance', location_type: 'home',
      insurance_provider: 'bupa',
    }, auth(U.patient.token)));
    if (s !== 400) throw new Error('expected 400, got ' + s);
    return '400';
  });

  await t('L10 per-slot capacity: 4th overlapping booking rejected', async () => {
    const mk = () => axios.post(`${base}/labs/bookings`, {
      items: [{ service_id: 'test-lab-svc-glu', qty: 1 }], scheduled_at: future(6, 9),
      provider_account_id: 'usr-test-lab', payment_method: 'card', location_type: 'facility',
    }, auth(U.patient.token));
    await mk(); await mk(); await mk();
    const s = await httpStatus(mk());
    if (s !== 400) throw new Error('4th booking got ' + s);
    return 'slot_taken';
  });

  // ══ R. RADIOLOGY — full lifecycle (patient booking was wired this milestone) ══
  await t('R1 patient books radiology via catalog service', async () => {
    const r = await axios.post(`${base}/radiology/bookings`, {
      service_id: 'test-rad-svc-xray', scheduled_at: future(3, 12), provider_account_id: 'usr-test-rad',
    }, auth(U.patient.token));
    K.rad = r.data;
    if (!K.rad?.id) throw new Error('no booking id');
    if (K.rad.status !== 'PENDING_ACCEPTANCE') throw new Error('status=' + K.rad.status);
  });

  await t('R2 provider queue shows the booking', async () => {
    const r = await axios.get(`${base}/radiology/provider/queue`, auth(U.rad.token));
    const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
    const found = list.find((b) => b.id === K.rad.id);
    if (!found) throw new Error('not in queue');
  });

  await t('R3 provider endpoints reject anonymous (security overhaul)', async () => {
    const s = await httpStatus(axios.post(`${base}/radiology/provider/${K.rad.id}/respond`, { accept: true }));
    if (s !== 401 && s !== 403) throw new Error('anonymous got ' + s);
    return String(s);
  });

  await t('R4 center accepts (identity from auth, not body)', async () => {
    const r = await axios.post(`${base}/radiology/provider/${K.rad.id}/respond`, { accept: true }, auth(U.rad.token));
    if (r.data?.status !== 'ACCEPTED') throw new Error('status=' + r.data?.status);
  });

  await t('R5 allocate machine → CHECKED_IN', async () => {
    const r = await axios.post(`${base}/radiology/provider/allocate-machine/${K.rad.id}`, { machineId: 'MACH-TEST-1' }, auth(U.rad.token));
    const st = r.data?.status || r.data?.data?.status;
    if (st !== 'CHECKED_IN') throw new Error('status=' + st);
  });

  await t('R6 finalize scan → REPORT_UPLOADED', async () => {
    const r = await axios.post(`${base}/radiology/provider/finalize-scan/${K.rad.id}`, {
      reportText: 'صدر سليم — لا توجد علامات مرضية.', files: ['https://cdn.example.com/scan1.dcm'], pdfUrl: 'https://cdn.example.com/report1.pdf',
    }, auth(U.rad.token));
    if (!r.data?.success) throw new Error('not success');
  });

  await t('R7 patient mine shows the report', async () => {
    const r = await axios.get(`${base}/radiology/bookings/mine`, auth(U.patient.token));
    const found = (r.data || []).find((b) => b.id === K.rad.id);
    if (!found) throw new Error('not in mine');
    if (found.status !== 'REPORT_UPLOADED') throw new Error('status=' + found.status);
  });

  // ══ N. NURSING / HOME CARE — full field-ops journey ══
  await t('N1 patient books home nursing (total preserved, not zeroed)', async () => {
    const r = await axios.post(`${base}/home-care/bookings`, {
      service_id: 'test-hc-svc-1', scheduled_at: future(2, 14),
      address: { lat: 24.7136, lng: 46.6753, text: 'الرياض — حي النرجس' },
      payment_method: 'card', provider_id: 'usr-test-nurse',
    }, auth(U.patient.token));
    K.nurse = r.data;
    const id = K.nurse?.id || K.nurse?.booking?.id;
    if (!id) throw new Error('no booking id');
    K.nurse.id = id;
    const total = K.nurse.total ?? K.nurse.total_price ?? K.nurse.booking?.total;
    if (total !== 200) throw new Error('total=' + total + ' (pricing hook regression!)');
    return `total=${total}`;
  });

  await t('N2 nurse sees the visit in his queue', async () => {
    const r = await axios.get(`${base}/nursing/visits?provider_id=usr-test-nurse`, auth(U.nurse.token));
    const found = (r.data || []).find((b) => b.id === K.nurse.id);
    if (!found) throw new Error('not in visits');
  });

  await t('N3 nurse accepts → CONFIRMED', async () => {
    const r = await axios.post(`${base}/nursing/visits/${K.nurse.id}/respond`, { accept: true }, auth(U.nurse.token));
    if (r.data?.state !== 'CONFIRMED') throw new Error('state=' + r.data?.state);
  });

  await t('N4 transit → IN_TRANSIT', async () => {
    const r = await axios.post(`${base}/nursing/visits/${K.nurse.id}/transit`, {}, auth(U.nurse.token));
    if (r.data?.state !== 'IN_TRANSIT') throw new Error('state=' + r.data?.state);
  });

  await t('N5 geofence: far arrival rejected, near accepted', async () => {
    const s = await httpStatus(axios.post(`${base}/nursing/visits/${K.nurse.id}/arrive`, { lat: 25.2, lng: 47.1 }, auth(U.nurse.token)));
    if (s !== 400) throw new Error('far arrival got ' + s);
    const r = await axios.post(`${base}/nursing/visits/${K.nurse.id}/arrive`, { lat: 24.7137, lng: 46.6754 }, auth(U.nurse.token));
    if (r.data?.state !== 'ARRIVED') throw new Error('state=' + r.data?.state);
    return 'geofence enforced';
  });

  await t('N6 no-show guard: blocked before 10 minutes', async () => {
    const s = await httpStatus(axios.post(`${base}/nursing/visits/${K.nurse.id}/no-show`, {}, auth(U.nurse.token)));
    if (s !== 400) throw new Error('early no-show got ' + s);
    return '400';
  });

  await t('N7 start-care → CARE_IN_PROGRESS', async () => {
    const r = await axios.post(`${base}/nursing/visits/${K.nurse.id}/start-care`, {}, auth(U.nurse.token));
    if (r.data?.state !== 'CARE_IN_PROGRESS') throw new Error('state=' + r.data?.state);
  });

  await t('N8 complete with vitals + signature → COMPLETED', async () => {
    const r = await axios.post(`${base}/nursing/visits/${K.nurse.id}/complete`, {
      vitals: { bp: '120/80', hr: 72, temp: 36.8 }, clinical_notes: 'تمت الزيارة بنجاح', recommendations: 'متابعة بعد أسبوع',
      signature_base64: Buffer.from('patient-signature').toString('base64'),
    }, auth(U.nurse.token));
    if (r.data?.state !== 'COMPLETED') throw new Error('state=' + r.data?.state);
  });

  await t('N9 patient sees completed visit', async () => {
    const r = await axios.get(`${base}/home-care/bookings/my`, auth(U.patient.token));
    const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
    const found = list.find((b) => b.id === K.nurse.id);
    if (!found) throw new Error('not in my bookings');
    if (found.state !== 'COMPLETED') throw new Error('state=' + found.state);
  });

  await t('N10 nurse wallet endpoint live', async () => {
    const r = await axios.get(`${base}/nursing/wallet?provider_id=usr-test-nurse`, auth(U.nurse.token));
    if (r.status !== 200) throw new Error('status ' + r.status);
    return typeof r.data === 'object' ? Object.keys(r.data).slice(0, 4).join(',') : 'ok';
  });

  // ══ PH. PHARMACY — order → dispatch → delivery ══
  await t('PH1 patient creates order (dispatch picks TEST pharmacy)', async () => {
    const r = await axios.post(`${base}/orders/create`, {
      items: [{ medicine_id: 'test-med-1', qty: 2 }],
      delivery_address: { lat: 24.7136, lng: 46.6753, text: 'الرياض — حي النرجس' },
    }, auth(U.patient.token));
    K.order = r.data?.order || r.data;
    if (!K.order?.id) throw new Error('no order id');
    if (K.order.pharmacy_id !== 'usr-test-pharm') throw new Error('pharmacy_id=' + K.order.pharmacy_id);
    const items = K.order.items || [];
    if (!items.length || items[0].price !== 25) throw new Error('items wrong: ' + JSON.stringify(items).slice(0, 80));
    return `items=${items.length} pharmacy=${K.order.pharmacy_id}`;
  });

  await t('PH2 pharmacy queue shows the order', async () => {
    const r = await axios.get(`${base}/orders/pharmacy/queue`, auth(U.pharm.token));
    const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
    const found = list.find((o) => o.id === K.order.id);
    if (!found) throw new Error('not in queue');
  });

  await t('PH3 accept → preparing → ready', async () => {
    await axios.post(`${base}/orders/${K.order.id}/accept`, {}, auth(U.pharm.token));
    const p = await axios.post(`${base}/orders/${K.order.id}/preparing`, {}, auth(U.pharm.token));
    if (p.data?.state && p.data.state !== 'PREPARING') throw new Error('state=' + p.data.state);
    const rdy = await axios.post(`${base}/orders/${K.order.id}/ready`, {}, auth(U.pharm.token));
    const st = rdy.data?.state;
    if (st && !['READY', 'READY_FOR_DISPATCH'].includes(st)) throw new Error('state=' + st);
    return st || 'ok';
  });

  await t('PH4 assign-delivery to TEST driver', async () => {
    const r = await axios.post(`${base}/orders/${K.order.id}/assign-delivery`, { driver_id: 'usr-test-driver' }, auth(U.pharm.token));
    const st = r.data?.state;
    if (st && st !== 'ASSIGNED_TO_DELIVERY') throw new Error('state=' + st);
  });

  await t('PH5 driver dispatches → OUT_FOR_DELIVERY', async () => {
    const r = await axios.post(`${base}/orders/${K.order.id}/dispatch`, {}, auth(U.driver.token));
    const st = r.data?.state;
    if (st && st !== 'OUT_FOR_DELIVERY') throw new Error('state=' + st);
  });

  await t('PH6 driver delivers → DELIVERED', async () => {
    const r = await axios.post(`${base}/orders/${K.order.id}/delivered`, {}, auth(U.driver.token));
    const st = r.data?.state;
    if (st && st !== 'DELIVERED') throw new Error('state=' + st);
  });

  await t('PH7 patient order history shows DELIVERED', async () => {
    const r = await axios.get(`${base}/orders/mine`, auth(U.patient.token));
    const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
    const found = list.find((o) => o.id === K.order.id);
    if (!found) throw new Error('not in mine');
    if (found.state !== 'DELIVERED') throw new Error('state=' + found.state);
  });

  await t('PH8 patient can cancel a fresh order', async () => {
    const r = await axios.post(`${base}/orders/create`, {
      items: [{ medicine_id: 'test-med-1', qty: 1 }],
      delivery_address: { lat: 24.7136, lng: 46.6753, text: 'الرياض' },
    }, auth(U.patient.token));
    const o = r.data?.order || r.data;
    const c = await axios.post(`${base}/orders/${o.id}/cancel`, {}, auth(U.patient.token));
    const st = c.data?.state || c.data?.order?.state;
    if (st && st !== 'CANCELLED') throw new Error('state=' + st);
    return 'cancelled';
  });

  // ══ X. CROSS-CUTTING ══
  await t('X1 review writes + aggregates on provider profile', async () => {
    await axios.post(`${base}/reviews`, {
      target_id: 'pp-test-nurse', target_type: 'provider', rating: 5,
      comment: 'خدمة ممتازة واحترافية عالية', booking_id: K.nurse.id,
    }, auth(U.patient.token));
    const l = await axios.get(`${base}/reviews?target_id=pp-test-nurse`);
    const items = l.data?.items || l.data?.data || (Array.isArray(l.data) ? l.data : []);
    if (!items.length) throw new Error('no reviews listed');
    const prof = await db.collection('provider_profiles').findOne({ id: 'pp-test-nurse' });
    if (prof?.rating_avg !== 5 || prof?.rating_count !== 1) throw new Error(`aggregate wrong: avg=${prof?.rating_avg} count=${prof?.rating_count}`);
    return 'rating_avg=5 count=1';
  });

  await t('X2 patient notifications inbox reachable', async () => {
    const r = await axios.get(`${base}/notifications`, auth(U.patient.token));
    if (r.status !== 200) throw new Error('status ' + r.status);
    const n = Array.isArray(r.data) ? r.data.length : (r.data?.data || r.data?.items || []).length;
    return `${n} notifications`;
  });

  await t('X3 admin audit trail reachable', async () => {
    const r = await axios.get(`${base}/admin/governance/audit-logs`, auth(U.admin.token));
    if (r.status !== 200) throw new Error('status ' + r.status);
    const n = Array.isArray(r.data) ? r.data.length : (r.data?.data || r.data?.items || r.data?.logs || []).length;
    return `${n} entries`;
  });

  await t('X4 provider documents list persisted (KYC)', async () => {
    const r = await axios.get(`${base}/provider/kyc/documents`, auth(U.newdoc.token));
    const list = r.data?.documents || (Array.isArray(r.data) ? r.data : r.data?.data) || [];
    if (list.length < 4) throw new Error('docs=' + list.length);
    return `${list.length} docs`;
  });

  // ══ SUMMARY ══
  const pass = results.filter((r) => r[0] === 'PASS').length;
  const fail = results.filter((r) => r[0] === 'FAIL').length;
  console.log('\n════════════════ MATRIX 2 (deep lifecycle) ════════════════');
  console.log(`TOTAL: ${pass} passed · ${fail} failed · ${skip.length} skipped`);
  if (skip.length) console.log('SKIPPED: ' + skip.join(' | '));
  if (fail) {
    console.log('FAILURES:');
    results.filter((r) => r[0] === 'FAIL').forEach((r) => console.log(`  ✗ ${r[1]} — ${r[2]}`));
  }
  await mc.close();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('MATRIX2 CRASHED:', e); process.exit(2); });
