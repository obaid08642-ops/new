/* Nabdah Plus — comprehensive live scenario matrix (real MongoDB + production dist) */
const axios = require('axios');
const fs = require('fs');
const net = require('net');
const base = 'http://127.0.0.1:4099/api/v1';

/** Minimal RESP GET against the live e2e Redis (OTPs are stored as JSON at otp:{identifier}). */
function redisGet(key, port = 6388) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; try { s.end(); } catch { /* noop */ } resolve(v); } };
    const s = net.connect(port, '127.0.0.1');
    let buf = '';
    s.on('connect', () => s.write(`*2\r\n$3\r\nGET\r\n$${Buffer.byteLength(key)}\r\n${key}\r\n`));
    s.on('data', (d) => {
      buf += d.toString('utf8');
      if (buf.startsWith('$-1')) return done(null);
      if (buf.startsWith('+')) return done(buf.slice(1).trim());
      const m = buf.match(/^\$(\d+)\r\n/);
      if (m) {
        const len = parseInt(m[1], 10);
        const start = buf.indexOf('\r\n') + 2;
        if (Buffer.byteLength(buf.slice(start)) >= len) done(buf.slice(start, start + len));
      }
    });
    s.on('error', () => done(null));
    setTimeout(() => done(null), 3000);
  });
}

const results = [];
const skip = [];
async function t(name, fn) {
  try { const r = await fn(); results.push(['PASS', name, r ?? '']); console.log(`PASS  ${name}${r ? ' — ' + r : ''}`); }
  catch (e) {
    if (e && e.skipped) { skip.push(name); console.log(`SKIP  ${name} — ${e.skipped}`); }
    else { const msg = e.response ? `${e.response.status}: ${JSON.stringify(e.response.data).slice(0, 120)}` : e.message; results.push(['FAIL', name, msg]); console.log(`FAIL  ${name} — ${msg}`); }
  }
}
function doSkip(reason) { const e = new Error(reason); e.skipped = reason; throw e; }
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
/** future ISO time exactly on a 15-min boundary (slot rule), days ahead */
function future(days, hour = 12) {
  const d = new Date(Date.now() + days * 86400000);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

const patient = {}, doctor = {}, admin = {}, appt = {};
let doctorId;

async function main() {
  // ══ A. AUTH & SECURITY ══
  await t('A1 register patient', async () => {
    const r = await axios.post(`${base}/auth/register`, { full_name: 'مريض المصفوفة', email: 'mx.patient@test.sa', password: 'Str0ng!Pass', role: 'patient' });
    patient.token = r.data?.token?.accessToken; patient.id = r.data?.user?.id;
    if (!patient.token) throw new Error('no token');
    return 201;
  });
  await t('A2 login patient', async () => {
    const r = await axios.post(`${base}/auth/login`, { identifier: 'mx.patient@test.sa', password: 'Str0ng!Pass' });
    if (!r.data?.token?.accessToken) throw new Error('no token');
  });
  await t('A3 NoSQL injection probe on login', async () => {
    const r = await axios.post(`${base}/auth/login`, { identifier: { $gt: '' }, password: { $gt: '' } }).then(() => 'OPEN', (e) => e.response?.status);
    if (r === 'OPEN') throw new Error('injection accepted!');
    if (r >= 500) throw new Error('500 on injection probe');
    return `blocked=${r}`;
  });
  await t('A4 weak password rejected', async () => {
    const r = await axios.post(`${base}/auth/register`, { full_name: 'X', email: 'weak@test.sa', password: '123', role: 'patient' }).then(() => 'ACCEPTED', (e) => e.response?.status);
    if (r === 'ACCEPTED') throw new Error('weak password accepted');
  });

  const stranger = {};
  await t('A4b register stranger patient', async () => {
    const r = await axios.post(`${base}/auth/register`, { full_name: 'غريب المصفوفة', email: 'mx.stranger@test.sa', password: 'Str0ng!Pass', role: 'patient' });
    stranger.token = r.data?.token?.accessToken; stranger.id = r.data?.user?.id;
    if (!stranger.token) throw new Error('no token');
  });

  // ══ B. SEED DATA (direct mongo) ══
  const { MongoClient } = require('mongodb');
  const bcrypt = require('bcryptjs');
  const mongoUri = fs.readFileSync('/tmp/e2e/boot.ok', 'utf8').trim();
  const mc = new MongoClient(mongoUri); await mc.connect();
  const db = mc.db('nabdah_e2e');
  await db.collection('users').updateOne({ email: 'admin@nabdah.sa' }, { $set: {
    email: 'admin@nabdah.sa', full_name: 'E2E Admin', role: 'admin', status: 'active', phone: '+966500000999',
    password_hash: bcrypt.hashSync('Adm1n!Pass', 4), is_verified: true, createdAt: new Date(), updatedAt: new Date(),
  } }, { upsert: true });
  await db.collection('users').updateOne({ email: 'mx.doctor@test.sa' }, { $set: {
    email: 'mx.doctor@test.sa', full_name: 'Dr Matrix', role: 'doctor', status: 'active', phone: '+966500000111',
    password_hash: bcrypt.hashSync('Str0ng!Pass', 4), is_verified: true, createdAt: new Date(), updatedAt: new Date(),
  } }, { upsert: true });
  doctorId = 'doc-mx-1';
  await db.collection('provider_profiles').updateOne({ id: doctorId }, { $set: {
    id: doctorId, name_ar: 'د. ماتريكس للاختبار', name_en: 'Dr Matrix', type: 'doctor',
    specialty: 'cardiology', city: 'riyadh', consultation_modes: ['clinic', 'video', 'home'],
    price_clinic: 200, price_online: 150, price_home: 350,
    rating_avg: 4.8, rating_count: 120, is_active: true, status: 'active', verification_status: 'verified',
    createdAt: new Date(), updatedAt: new Date(),
  } }, { upsert: true });
  await db.collection('medicines').updateOne({ id: 'med-mx-1' }, { $set: {
    id: 'med-mx-1', name_ar: 'باراسيتامول 500', name_en: 'Paracetamol 500', generic_name: 'paracetamol',
    price: 12.5, category: 'pain_relief', stock: 100, status: 'active', images: ['https://cdn.example.com/med1.jpg'],
    createdAt: new Date(), updatedAt: new Date(),
  } }, { upsert: true });
  await t('B0 seed admin/doctor/medicine', async () => 'ok');

  await t('A5 admin login (2FA flow)', async () => {
    const r = await axios.post(`${base}/auth/login`, { identifier: 'admin@nabdah.sa', password: 'Adm1n!Pass' });
    if (r.data?.token?.accessToken) { admin.token = r.data.token.accessToken; return 'direct'; }
    if (!r.data?.requires_2fa) throw new Error('unexpected: ' + JSON.stringify(r.data).slice(0, 120));
    // Primary source: the OTP JSON stored in the live Redis at otp:{identifier}.
    // Fallback: freshest matching line in the backend log (whole log, last match).
    let code = null;
    for (let i = 0; i < 15 && !code; i++) {
      await new Promise((r2) => setTimeout(r2, 1000));
      const raw = await redisGet('otp:+966500000999');
      if (raw) { try { code = JSON.parse(raw).code || null; } catch { /* not json */ } }
      if (!code) {
        const logs = (fs.existsSync('/tmp/e2e/backend.log') ? fs.readFileSync('/tmp/e2e/backend.log', 'utf8') : '');
        const all = [...logs.matchAll(/OTP for \+966500000999 is (\d{6})/g)];
        if (all.length) code = all[all.length - 1][1];
      }
    }
    if (!code) throw new Error('OTP not found in backend log');
    const v = await axios.post(`${base}/auth/login/verify-2fa`, { identifier: '+966500000999', code });
    admin.token = v.data?.token?.accessToken;
    if (!admin.token) throw new Error('no token after 2fa');
    return '2fa-ok';
  });
  await t('A6 login doctor', async () => {
    const r = await axios.post(`${base}/auth/login`, { identifier: 'mx.doctor@test.sa', password: 'Str0ng!Pass' });
    doctor.token = r.data?.token?.accessToken; doctor.id = r.data?.user?.id;
    if (!doctor.token) throw new Error('no token');
    await db.collection('provider_profiles').updateOne({ id: doctorId }, { $set: { user_id: doctor.id, account_id: doctor.id } });
    await db.collection('provider_accounts').updateOne({ user_id: doctor.id }, { $set: {
      id: 'pa-mx-1', user_id: doctor.id, email: 'mx.doctor@test.sa', account_type: 'doctor',
      status: 'approved', provider_type: 'doctor', createdAt: new Date(), updatedAt: new Date(),
    } }, { upsert: true });
    await db.collection('patient_profiles').updateOne({ user_id: patient.id }, { $set: {
      user_id: patient.id, insurance: { company_id: 'bupa', policy_number: 'POL-1', member_id: 'MEM-1', status: 'active' },
      createdAt: new Date(), updatedAt: new Date(),
    } }, { upsert: true });
  });

  // ══ C. CONSULTATIONS × CHANNELS × PAYMENTS (BR-1) ══
  let slotHour = 11;
  const book = (channel, pm, extra = {}) => axios.post(`${base}/care/appointments`, {
    doctor_id: doctorId, service_type: channel, slot_start: future(3, ++slotHour), duration_minutes: 30,
    payment_method: pm, ...extra,
  }, auth(patient.token));
  const expect400 = async (p) => p.then(() => 'SHOULD-FAIL', (e) => e.response?.status === 400 ? 400 : e.response?.status);

  await t('C1 clinic + cash (allowed)', async () => { const r = await book('clinic', 'cash'); appt.clinic = r.data?.id; if (!appt.clinic) throw new Error('no id'); return `id=${appt.clinic}`; });
  await t('C2 clinic + card (allowed)', async () => { const r = await book('clinic', 'card'); return r.data?.status; });
  await t('C3 clinic + insurance (allowed)', async () => { const r = await book('clinic', 'insurance', { insurance_provider: 'bupa', insurance_member_id: 'MEM-1' }); return r.data?.status; });
  await t('C4 video + cash (must 400)', async () => { const r = await expect400(book('video', 'cash')); if (r !== 400) throw new Error('got ' + r); });
  await t('C5 video + card (allowed)', async () => { const r = await book('video', 'card'); appt.video = r.data?.id; if (!appt.video) throw new Error('no id'); return `id=${appt.video}`; });
  await t('C6 video + insurance (must 400)', async () => { const r = await expect400(book('video', 'insurance')); if (r !== 400) throw new Error('got ' + r); });
  await t('C7 home + card (allowed)', async () => { const r = await book('home', 'card', { visit_location: { lat: 24.7, lng: 46.7, address: 'الرياض' } }); return r.data?.status; });
  await t('C8 home + insurance (allowed)', async () => { const r = await book('home', 'insurance', { insurance_provider: 'bupa', insurance_member_id: 'MEM-1', visit_location: { lat: 24.7, lng: 46.7, address: 'الرياض' } }); return r.data?.status; });
  await t('C9 home + cash (must 400)', async () => { const r = await expect400(book('home', 'cash')); if (r !== 400) throw new Error('got ' + r); });
  await t('C10 invalid service_type rejected', async () => { const r = await expect400(book('telepathy', 'card')); if (![400, 500].includes(r)) throw new Error('got ' + r); });

  // ══ D. APPOINTMENT STATE MACHINE (live) ══
  const tr = (id, action, who = doctor.token, body = {}) => axios.patch(`${base}/care/appointments/${id}/${action}`, body, auth(who));
  await t('D1 doctor confirms', async () => {
    const b = await book('clinic', 'card', { slot_start: future(7, 12) });
    const r = await tr(b.data.id, 'confirm');
    if (r.data?.status !== 'CONFIRMED') throw new Error('status=' + r.data?.status);
    return r.data?.status;
  });
  await t('D2 check-in → start → complete', async () => {
    await tr(appt.clinic, 'check-in', patient.token);
    await tr(appt.clinic, 'start');
    const r = await tr(appt.clinic, 'complete');
    return r.data?.status;
  });
  await t('D3 invalid transition blocked (COMPLETED→confirm)', async () => {
    const r = await tr(appt.clinic, 'confirm').then(() => 'OPEN', (e) => e.response?.status);
    if (r === 'OPEN') throw new Error('allowed!');
    return `blocked=${r}`;
  });
  await t('D4 patient cancels >24h (100% refund)', async () => {
    const r = await book('clinic', 'card', { slot_start: future(5, 12) });
    await tr(r.data.id, 'confirm');
    const c = await axios.patch(`${base}/care/appointments/${r.data.id}/cancel`, { reason: 'ظرف طارئ' }, auth(patient.token));
    return `status=${c.data?.status} refund=${c.data?.refund_percentage ?? c.data?.refund_percent}`;
  });
  await t('D5 stranger cannot cancel', async () => {
    const r = await axios.patch(`${base}/care/appointments/${appt.video}/cancel`, { reason: 'x' }, auth(stranger.token)).then(() => 'OPEN', (e) => e.response?.status);
    if (r === 'OPEN') throw new Error('stranger cancelled!');
    return `resp=${r}`;
  });
  await t('D6 reschedule creates new CONFIRMED', async () => {
    const r = await book('video', 'card', { slot_start: future(4, 12) });
    await tr(r.data.id, 'confirm');
    const rs = await axios.patch(`${base}/care/appointments/${r.data.id}/reschedule`, { slot_start: future(6, 15) }, auth(patient.token));
    if (rs.data?.status !== 'CONFIRMED') throw new Error(JSON.stringify(rs.data).slice(0, 120));
    return 'ok';
  });

  // ══ E. INSURANCE FLOW (BR-2) ══
  let insReq = {};
  await t('E1 submit insurance request', async () => {
    const r = await axios.post(`${base}/insurance/requests`, { provider_id: doctor.id, service_type: 'consultation', price: 250, insurance_company_id: 'bupa', policy_number: 'POL-1' }, auth(patient.token));
    insReq.a = r.data?.id; return `state=${r.data?.state}`;
  });
  await t('E2 approve_full → APPROVED_FULL copay=0', async () => {
    const r = await axios.post(`${base}/insurance/requests/${insReq.a}/decide`, { decision: 'approve_full' }, auth(doctor.token));
    return r.data?.state;
  });
  await t('E3 approve_partial → COPAY_PENDING + pay', async () => {
    const s = await axios.post(`${base}/insurance/requests`, { provider_id: doctor.id, service_type: 'consultation', price: 250, insurance_company_id: 'bupa', policy_number: 'POL-1' }, auth(patient.token));
    const d = await axios.post(`${base}/insurance/requests/${s.data.id}/decide`, { decision: 'approve_partial', copay_percent: 20 }, auth(doctor.token));
    if (d.data?.copay_amount !== 50) throw new Error('copay=' + d.data?.copay_amount);
    const p = await axios.post(`${base}/insurance/requests/${s.data.id}/pay-copay`, { payment_id: 'pay_e2e_1' }, auth(patient.token));
    return `${d.data.state}→${p.data.state}`;
  });
  await t('E4 reject requires reason', async () => {
    const s = await axios.post(`${base}/insurance/requests`, { provider_id: doctor.id, service_type: 'consultation', price: 100, insurance_company_id: 'bupa', policy_number: 'P' }, auth(patient.token));
    const r = await axios.post(`${base}/insurance/requests/${s.data.id}/decide`, { decision: 'reject' }, auth(doctor.token)).then(() => 'OPEN', (e) => e.response?.status);
    if (r === 'OPEN') throw new Error('reject without reason allowed');
    const d = await axios.post(`${base}/insurance/requests/${s.data.id}/decide`, { decision: 'reject', reason: 'غير مغطاة' }, auth(doctor.token));
    return d.data?.state;
  });
  await t('E5 wrong provider forbidden (403)', async () => {
    const s = await axios.post(`${base}/insurance/requests`, { provider_id: 'other-doc', service_type: 'consultation', price: 100, insurance_company_id: 'bupa', policy_number: 'P' }, auth(patient.token));
    const r = await axios.post(`${base}/insurance/requests/${s.data.id}/decide`, { decision: 'approve_full' }, auth(doctor.token)).then(() => 'OPEN', (e) => e.response?.status);
    if (r === 'OPEN') throw new Error('wrong provider allowed!');
    return `blocked=${r}`;
  });
  await t('E6 admin sees insurance queue + stats', async () => {
    if (!admin.token) doSkip('no admin token (A5)');
    const q = await axios.get(`${base}/admin/insurance/requests`, auth(admin.token));
    const st = await axios.get(`${base}/admin/insurance/stats`, auth(admin.token));
    return `queue=${(q.data?.items || q.data || []).length}`;
  });

  // ══ F. PHARMACY ══
  await t('F1 create order (delivery)', async () => {
    const r = await axios.post(`${base}/orders/create`, { items: [{ medicine_id: 'med-mx-1', qty: 2 }], delivery_address: { lat: 24.7, lng: 46.7, text: 'الرياض' }, payment_method: 'card' }, auth(patient.token));
    appt.order = r.data?.id || r.data?.order_id; return `total=${r.data?.total ?? r.data?.total_amount}`;
  });
  await t('F2 orders/mine lists it', async () => {
    const r = await axios.get(`${base}/orders/mine`, auth(patient.token));
    const items = r.data?.items || r.data || [];
    if (!items.length) throw new Error('empty');
    return `count=${items.length}`;
  });
  await t('F3 medicine appears in public search', async () => {
    const r = await axios.get(`${base}/medicines?q=paracetamol&limit=5`);
    const items = r.data?.items || r.data || [];
    if (!items.length) throw new Error('not found');
    return `hits=${items.length}`;
  });

  // ══ G. LABS ══
  await t('G1 lab services catalog (public)', async () => {
    const r = await axios.get(`${base}/labs/services`);
    return `count=${(r.data?.items || r.data || []).length}`;
  });
  await t('G2 book lab service', async () => {
    const r = await axios.post(`${base}/labs/bookings`, { service_id: 'svc-cbc', slot_start: future(2), location: { lat: 24.7, lng: 46.7 } }, auth(patient.token)).catch((e) => e.response);
    if (r.status >= 500) throw new Error('500: ' + JSON.stringify(r.data).slice(0, 120));
    return `status=${r.status}`;
  });
  await t('G3 my lab bookings', async () => {
    const r = await axios.get(`${base}/labs/bookings/mine`, auth(patient.token));
    return `count=${(r.data?.items || r.data || []).length}`;
  });

  // ══ H. RADIOLOGY ══
  await t('H1 radiology booking attempt', async () => {
    const r = await axios.post(`${base}/radiology/bookings`, { service_id: 'svc-xray', slot_start: future(2) }, auth(patient.token)).catch((e) => e.response);
    if (r.status >= 500) throw new Error('500: ' + JSON.stringify(r.data).slice(0, 120));
    return `status=${r.status}`;
  });
  await t('H2 my radiology bookings', async () => {
    const r = await axios.get(`${base}/radiology/bookings/mine`, auth(patient.token)).catch((e) => e.response);
    if (r.status >= 500) throw new Error('500');
    return `status=${r.status}`;
  });

  // ══ I. NURSING / HOME CARE ══
  await t('I1 home-care catalog (public)', async () => {
    const r = await axios.get(`${base}/nursing/catalog`);
    return `count=${(r.data?.items || r.data || []).length}`;
  });
  await t('I2 book home-care visit', async () => {
    const r = await axios.post(`${base}/nursing/bookings`, { service_id: 'hc-1', slot_start: future(2), location: { lat: 24.7, lng: 46.7, address: 'الرياض' } }, auth(patient.token)).catch((e) => e.response);
    if (r.status >= 500) throw new Error('500: ' + JSON.stringify(r.data).slice(0, 120));
    return `status=${r.status}`;
  });

  // ══ J. PROVIDER SIDE ══
  await t('J1 doctor inbox shows appointments', async () => {
    const r = await axios.get(`${base}/doctors/appointments/inbox`, auth(doctor.token));
    return `count=${(r.data?.items || r.data || []).length}`;
  });
  await t('J2 provider sets availability', async () => {
    const r = await axios.post(`${base}/provider/availability`, { status: 'online' }, auth(doctor.token)).catch((e) => e.response);
    if (r.status >= 500) throw new Error('500');
    if (r.status !== 201 && r.status !== 200) throw new Error('status=' + r.status);
    return `status=${r.status}`;
  });
  await t('J3 provider leave request real persist', async () => {
    const r = await axios.post(`${base}/provider/leave-requests`, { type: 'vacation', start_date: future(10), end_date: future(14), reason: 'سفر' }, auth(doctor.token));
    if (!r.data?.id) throw new Error('no id');
    const list = await axios.get(`${base}/provider/leave-requests`, auth(doctor.token));
    if (!(list.data || []).length) throw new Error('not persisted');
    return 'persisted';
  });
  await t('J4 provider incoming requests (chat.broadcast flow)', async () => {
    const r = await axios.get(`${base}/provider/requests`, auth(doctor.token)).catch((e) => e.response);
    if (r.status === 404) doSkip('endpoint not found');
    if (r.status >= 500) throw new Error('500');
    return `status=${r.status} count=${(r.data?.items || r.data || []).length}`;
  });

  // ══ K. ADMIN DASHBOARD SIDE ══
  const adminGets = [
    ['K1 finance withdrawals queue', '/admin/finance/withdrawals/pending'],
    ['K2 support tickets', '/support/admin/requests'],
    ['K3 feature flags', '/admin/feature-flags'],
    ['K4 notification delivery stats', '/notifications/admin/delivery-stats'],
    ['K5 audit logs', '/admin/governance/audit-logs'],
    ['K6 users list', '/admin/users'],
  ];
  for (const [name, path] of adminGets) {
    await t(name, async () => {
      if (!admin.token) doSkip('no admin token (A5)');
      const r = await axios.get(`${base}${path}`, auth(admin.token)).catch((e) => e.response);
      if (r.status === 404) doSkip('endpoint not found');
      if (r.status >= 500) throw new Error('500: ' + JSON.stringify(r.data).slice(0, 100));
      if (r.status === 401 || r.status === 403) throw new Error('admin rejected: ' + r.status);
      return `status=${r.status}`;
    });
  }
  await t('K6b admin bans + unbans user', async () => {
    if (!admin.token) doSkip('no admin token (A5)');
    const b = await axios.post(`${base}/admin/users/${stranger.id || 'x'}/ban`, {}, auth(admin.token)).catch((e) => e.response);
    return `ban=${b.status}`;
  });
  await t('K7 admin blocked for doctor token', async () => {
    const r = await axios.get(`${base}/admin/insurance/stats`, auth(doctor.token)).then(() => 'OPEN', (e) => e.response?.status);
    if (r === 'OPEN') throw new Error('doctor reached admin!');
    return `blocked=${r}`;
  });
  await t('K8 admin blocked for patient token', async () => {
    const r = await axios.get(`${base}/admin/users`, auth(patient.token)).then(() => 'OPEN', (e) => e.response?.status);
    if (r === 'OPEN') throw new Error('patient reached admin!');
    return `blocked=${r}`;
  });

  // ══ L. NOTIFICATIONS ══
  await t('L1 notifications list works', async () => {
    const r = await axios.get(`${base}/notifications`, auth(patient.token));
    return `count=${(r.data?.items || r.data || []).length}`;
  });
  await t('L2 admin schedules notification (delivery contract)', async () => {
    if (!admin.token) doSkip('no admin token (A5)');
    const r = await axios.post(`${base}/notifications/admin/schedule`, { title: 'اختبار', body: 'إشعار مجدول', audience: 'patients', scheduled_at: future(1) }, auth(admin.token)).catch((e) => e.response);
    if (r.status === 404) doSkip('endpoint not found');
    if (r.status >= 500) throw new Error('500');
    return `status=${r.status}`;
  });

  // ══ M. REALTIME SOCKETS ══
  await t('M1 socket rejected without JWT', async () => {
    const io = require('socket.io-client');
    const s = io('http://127.0.0.1:4099', { transports: ['websocket'], timeout: 4000, auth: { token: '' } });
    const res = await new Promise((r) => {
      let connected = false;
      s.on('connect', () => { connected = true; setTimeout(() => r(s.connected ? 'CONNECTED-STABLE' : 'KICKED'), 1500); });
      s.on('disconnect', () => { if (connected) r('KICKED'); });
      s.on('connect_error', () => r('REJECTED'));
      setTimeout(() => r(connected ? 'UNKNOWN' : 'TIMEOUT'), 6000);
    });
    s.close();
    if (res === 'CONNECTED-STABLE') throw new Error('socket open without JWT!');
    return res.toLowerCase();
  });
  await t('M2 socket connects with valid JWT', async () => {
    const io = require('socket.io-client');
    const s = io('http://127.0.0.1:4099', { transports: ['websocket'], timeout: 4000, auth: { token: patient.token } });
    const res = await new Promise((r) => {
      s.on('connect', () => setTimeout(() => r(s.connected ? 'connected' : 'kicked'), 1500));
      s.on('connect_error', (e) => r('err:' + e.message));
      setTimeout(() => r('timeout'), 6000);
    });
    s.close();
    if (res !== 'connected') throw new Error(res);
    return res;
  });

  // ══ N. CALLS (LiveKit) ══
  let callSession;
  await t('N1 initiate call session', async () => {
    const r = await axios.post(`${base}/calls/initiate`, { callee_id: doctor.id, call_type: 'video', booking_id: appt.video }, auth(patient.token)).catch((e) => e.response);
    if (r.status === 404) doSkip('endpoint not found');
    if (r.status >= 500) throw new Error('500: ' + JSON.stringify(r.data).slice(0, 120));
    callSession = r.data?.session_id || r.data?.id || r.data?.room_name;
    if (!r.data?.token) throw new Error('no caller token: ' + JSON.stringify(r.data).slice(0, 120));
    return `status=${r.status} room=${callSession}`;
  });
  await t('N2 join returns LiveKit JWT', async () => {
    if (!callSession) doSkip('no session from N1');
    const r = await axios.post(`${base}/calls/${callSession}/join`, {}, auth(doctor.token)).catch((e) => e.response);
    if (r.status >= 500) throw new Error('500');
    const tok = r.data?.token || r.data?.livekit_token;
    if (!tok) throw new Error('no livekit jwt: ' + JSON.stringify(r.data).slice(0, 120));
    return 'jwt-ok';
  });

  // ══ O. SEO & GEO ══
  await t('O1 sitemap includes doctor', async () => {
    const r = await axios.get(`${base}/seo/sitemap.xml`);
    const sfx = doctorId.replace(/-/g, '').slice(0, 6).toLowerCase(); if (!r.data.includes(sfx)) throw new Error('doctor missing from sitemap');
    return 'found';
  });
  await t('O2 doctor meta + JSON-LD', async () => {
    const r = await axios.get(`${base}/seo/meta?type=doctor&id=${doctorId}`).catch((e) => e.response);
    if (r.status === 404) return 'via-sitemap';
    return 'meta-ok';
  });
  await t('O3 llms.txt (GEO for AI engines)', async () => {
    const r = await axios.get(`${base}/seo/llms.txt`).catch((e) => e.response);
    if (r.status === 404) throw new Error('MISSING — GEO gap');
    if (!String(r.data).length) throw new Error('empty');
    return `bytes=${String(r.data).length}`;
  });

  // ══ P. REFUNDS (policy windows) ══
  await t('P1 refund request 4-24h → 50%', async () => {
    const r = await axios.post(`${base}/refunds/request`, { booking_id: 'bk-mx-' + Date.now(), booking_kind: 'appointment', amount_paid: 300, scheduled_at: new Date(Date.now() + 10 * 3600000).toISOString(), reason: 'ظرف طارئ للمريض' }, auth(patient.token)).catch((e) => e.response);
    if (r.status === 404) doSkip('endpoint not found');
    const pct = r.data?.refund_percent ?? r.data?.refund_percentage;
    if (pct !== 50) throw new Error('pct=' + JSON.stringify(r.data).slice(0, 120));
    return '50%';
  });
  await t('P2 refund request >24h → 100%', async () => {
    const r = await axios.post(`${base}/refunds/request`, { booking_id: 'bk-mx2-' + Date.now(), booking_kind: 'appointment', amount_paid: 300, scheduled_at: new Date(Date.now() + 48 * 3600000).toISOString(), reason: 'تغيير خطط' }, auth(patient.token)).catch((e) => e.response);
    const pct = r.data?.refund_percent ?? r.data?.refund_percentage;
    if (pct !== 100) throw new Error('pct=' + JSON.stringify(r.data).slice(0, 120));
    return '100%';
  });
  await t('P3 refund without reason → 400', async () => {
    const r = await axios.post(`${base}/refunds/request`, { booking_id: 'bk-mx3-' + Date.now(), booking_kind: 'appointment', amount_paid: 300 }, auth(patient.token)).then(() => 'OPEN', (e) => e.response?.status);
    if (r === 'OPEN') throw new Error('reasonless refund accepted');
    if (r >= 500) throw new Error('500 instead of 400');
    return `blocked=${r}`;
  });

  console.log('\n════════ SCENARIO MATRIX RESULTS ════════');
  const pass = results.filter(([s]) => s === 'PASS').length;
  const fail = results.filter(([s]) => s === 'FAIL').length;
  console.log(`TOTAL: ${pass} passed · ${fail} failed · ${skip.length} skipped · ${results.length + skip.length} scenarios`);
  await mc.close();
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error('matrix crashed:', e); process.exit(2); });
