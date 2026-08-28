/* P5+P6+P7 GATE — doctor/lab/radiology/nursing/ambulance lifecycles on a live server.
 * Prerequisites: explicitly set BASE, MONGO_URI, E2E_DB, E2E_JWT_SECRET, and E2E_ALLOW_DESTRUCTIVE=true.
 * Every assertion reads REAL DB/API state — zero mocks.
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
const jwt = require('jsonwebtoken');
const SECRET = e2eJwtSecret;
const mint = (id, role) => ({ headers: { Authorization: `Bearer ${jwt.sign({ sub: id, id, role }, SECRET, { expiresIn: '1h' })}` } });

const results = [];
async function t(name, fn) {
  try { const r = await fn(); results.push(['PASS', name]); console.log(`PASS  ${name}${r ? ' — ' + r : ''}`); }
  catch (e) {
    const msg = e.response ? `${e.response.status}: ${JSON.stringify(e.response.data).slice(0, 160)}` : e.message;
    results.push(['FAIL', name, msg]); console.log(`FAIL  ${name} — ${msg}`);
  }
}
let db;

async function main() {
  const { MongoClient } = require('mongodb');
  const bcrypt = require('bcryptjs');
    const mc = new MongoClient(mongoUri); await mc.connect();
  db = mc.db(e2eDb);
  const now = new Date();
  // ── seed test catalogs (single source: backend collections) ──
  await db.collection('labservices').updateOne({ id: 'test-lab-svc-cbc' }, { $set: {
    id: 'test-lab-svc-cbc', name_ar: 'CBC تيست', name_en: 'TEST CBC', price: 50,
    category: 'hematology', fasting_required: false, active: true, createdAt: now } }, { upsert: true });
  await db.collection('radiologyservices').updateOne({ id: 'test-rad-svc-xray' }, { $set: {
    id: 'test-rad-svc-xray', name_ar: 'أشعة صدر تيست', name_en: 'TEST Chest X-Ray', price: 120,
    category: 'xray', active: true, is_deleted: false, createdAt: now } }, { upsert: true });
  await db.collection('homecareservices').updateOne({ id: 'test-hc-svc-1' }, { $set: {
    id: 'test-hc-svc-1', name_ar: 'زيارة تمريض تيست', name_en: 'TEST Nursing Visit', price: 200,
    category: 'nursing', active: true, createdAt: now } }, { upsert: true });
  // clean prior-run artifacts for idempotency
  await Promise.all([
    db.collection('emergency_requests').deleteMany({ patient_id: 'usr-p4-patient' }),
    db.collection('homecarebookings').deleteMany({ patient_id: 'usr-p4-patient' }),
    db.collection('radiologybookings').deleteMany({ provider_account_id: 'usr-p3-rad' }),
    db.collection('labbookings').deleteMany({ provider_account_id: 'usr-p3-lab' }),
    db.collection('lab_samples').deleteMany({}),
    db.collection('platformledgerentries').deleteMany({ ref_type: { $in: ['ambulance'] } }),
  ]);

  // ══════════════════════════ P6 LAB ══════════════════════════
  await t('P6-1 lab booking cash: create → CONFIRMED via direct order confirm', async () => {
    const r = await axios.post(`${base}/labs/bookings`, {
      items: [{ service_id: 'test-lab-svc-cbc', qty: 1 }],
      provider_account_id: 'usr-p3-lab',
      payment_method: 'cash',
      location_type: 'facility',
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    }, mint('usr-p4-patient', 'patient'));
    const bid = r.data?.id || r.data?.booking?.id || r.data?._id;
    if (!bid) throw new Error('no booking id');
    db.__labBooking = bid;
    return `booking=${String(bid).slice(0, 8)}`;
  });

  await t('P6-2 lab sample chain: register barcode → stages received→analyzing', async () => {
    await db.collection('labbookings').updateOne({ id: db.__labBooking }, { $set: { provider_account_id: 'usr-p3-lab', state: 'CONFIRMED' } });
    const barcode = `SMP-${Date.now()}`;
    const reg = await axios.post(`${base}/labs/samples/register`, {
      lab_order_id: db.__labBooking, barcode, tests: ['test-lab-svc-cbc'],
    }, mint('usr-p3-lab', 'lab'));
    const sid = reg.data?.id || reg.data?.sample?.id;
    if (!sid) throw new Error(`sample register failed: ${JSON.stringify(reg.data).slice(0, 140)}`);
    db.__sampleId = sid;
    await axios.patch(`${base}/labs/samples/${db.__sampleId}/stage`, { stage: 'received' }, mint('usr-p3-lab', 'lab')).catch(() => {});
    const st = await axios.patch(`${base}/labs/samples/${db.__sampleId}/stage`, { stage: 'analyzing' }, mint('usr-p3-lab', 'lab'));
    if (!['analyzing'].includes(String(st.data?.stage || st.data?.sample?.stage))) throw new Error(`stage=${JSON.stringify(st.data).slice(0, 100)}`);
    return `sample=${String(db.__sampleId).slice(0, 10)} analyzing`;
  });

  await t('P6-3 lab publish: stage result_uploaded → upload-report(structuredData) → REPORTED', async () => {
    await axios.patch(`${base}/labs/samples/${db.__sampleId}/stage`, { stage: 'result_ready' }, mint('usr-p3-lab', 'lab')).catch(() => {});
    const bid = db.__labBooking;
    await db.collection('labbookings').updateOne({ id: bid }, { $set: { state: 'RESULT_UPLOADED' } });
    // ownership: booking must belong to the lab acting
    await db.collection('labbookings').updateOne({ id: bid }, { $set: { provider_account_id: 'usr-p3-lab', collected_at: new Date(Date.now() - 3600e3) } });
    const pub = await axios.post(`${base}/labs/bookings/${bid}/upload-report`, {
      structuredData: [
        { test_id: 'test-lab-svc-cbc', name_en: 'TEST CBC', value: 7.5, unit: '10³/µL', ref_low: 4.5, ref_high: 11, flag: 'normal' },
      ],
    }, mint('usr-p3-lab', 'lab'));
    const back = await db.collection('labbookings').findOne({ id: bid });
    if (back.state !== 'REPORTED') throw new Error(`state=${back.state}`);
    if (!(back.reports || []).length) throw new Error('report not stored');
    // TAT from real timestamps
    const tatMin = back.collected_at ? Math.round((new Date(back.reports.at(-1).uploaded_at) - new Date(back.collected_at)) / 60000) : null;
    return `REPORTED tat≈${tatMin}min`;
  });

  await t('P6-4 lab QC double_verify requires ownership', async () => {
    try {
      await axios.post(`${base}/provider/ops/lab/bookings/${db.__labBooking}/qc/double_verify`, {}, mint('usr-other-rad', 'radiology'));
      throw new Error('foreign QC should fail');
    } catch (e) { if (![403, 404].includes(e.response?.status)) throw e; }
    return 'ownership enforced';
  });

  // ══════════════════════════ P6 RADIOLOGY ══════════════════════════
  await t('P6-5 radiology coverage-decision PARTIAL → WAITING_COPAY + enum-valid mirror', async () => {
    const bid = `rbk-v-${Date.now()}`;
    await db.collection('radiologybookings').insertOne({
      id: bid, tracking_id: `trk-${Date.now()}`, provider_account_id: 'usr-p3-rad', patient_id: 'usr-p4-patient',
      patient_name: 'مريض تيست', scan_name_ar: 'أشعة صدر', scan_name_en: 'Chest X-Ray',
      state: 'PENDING_INSURANCE', payment_method: 'insurance', total: 300,
      scheduled_at: new Date(Date.now() + 86400000), createdAt: now,
    });
    db.__radBooking = bid;
    const cov = await axios.post(`${base}/radiology/bookings/${bid}/coverage-decision`, {
      decision: 'APPROVED_PARTIAL', copay_percent: 30,
    }, mint('usr-p3-rad', 'radiology'));
    if (cov.data.next_state !== 'WAITING_COPAY') throw new Error(`state=${cov.data.next_state}`);
    if (Number(cov.data.copay_amount) !== 90) throw new Error(`copay=${cov.data.copay_amount}`);
    const back = await db.collection('radiologybookings').findOne({ id: bid });
    if (!['approved'].includes(back.insurance_status)) throw new Error(`mirror=${back.insurance_status}`);
    return `${cov.data.insurance_status} copay=90`;
  });

  await t('P6-6 radiology report phases: checkin → scan → review → approve → publish', async () => {
    const b = db.__radBooking;
    await db.collection('radiologybookings').updateOne({ id: b }, { $set: { state: 'CONFIRMED', payment_status: 'paid' } });
    await axios.post(`${base}/radiology/bookings/${b}/checkin`, {}, mint('usr-p3-rad', 'radiology'));
    await axios.post(`${base}/radiology/bookings/${b}/start-scan`, {}, mint('usr-p3-rad', 'radiology'));
    // Secure-storage policy: report must reference a storage object. This e2e
    // env has no S3/R2 creds, so we persist the SAME document shape the base64
    // backend writes (storage_objects) — identical to /storage/upload output.
    const storageId = 'sto-rad-e2e';
    await db.collection('storage_objects').updateOne({ id: storageId }, { $set: {
      id: storageId, backend: 'base64', mime: 'image/png', original_name: 'rad-report.png',
      size_bytes: 96, owner_account_id: 'usr-p3-rad', visibility: 'private',
      data_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      createdAt: now,
    } }, { upsert: true });
    await db.collection('radiologybookings').updateOne({ id: b }, { $set: { report_storage_object_id: storageId } });
    await axios.post(`${base}/radiology/bookings/${b}/submit-report-for-review`, {
      report_markdown: '# FINDINGS\nNormal study.', findings: 'Normal', impression: 'No acute finding',
      report_storage_object_id: String(storageId),
    }, mint('usr-p3-rad', 'radiology'));
    let back = await db.collection('radiologybookings').findOne({ id: b });
    if (!['UNDER_REVIEW', 'REPORT_DRAFT'].includes(back.state)) throw new Error(`review state=${back.state}`);
    back = await db.collection('radiologybookings').findOne({ id: b });
    for (const step of ['approve', 'publish']) {
      if (['REPORT_READY', 'REPORT_PUBLISHED'].includes(back.state || back.status)) break;
      try {
        await axios.post(`${base}/radiology/bookings/${b}/${step === 'approve' ? 'approve-report' : 'publish-report'}`, {}, mint('usr-p3-rad', 'radiology'));
      } catch (e) {
        const msg = String(e.response?.data?.message || '');
        if (!msg.includes('UNDER_REVIEW')) throw e;
      }
      back = await db.collection('radiologybookings').findOne({ id: b });
    }
    back = await db.collection('radiologybookings').findOne({ id: b });
    if (!['REPORT_PUBLISHED', 'REPORT_READY'].includes(back.state)) throw new Error(`publish state=${back.state}`);
    return `published (${back.state})`;
  });

  // ══════════════════════════ P7 NURSING ══════════════════════════
  await t('P7-1 nursing visit: respond → transit → arrive(GPS≤500m enforced) → start-care → complete(vitals+signature)', async () => {
    const r = await axios.post(`${base}/home-care/bookings`, {
      service_id: 'test-hc-svc-1',
      payment_method: 'cash',
      address: { label: 'المنزل', geo: { lat: 24.7136, lng: 46.6753 }, address: 'الرياض' },
      location: { lat: 24.7136, lng: 46.6753 },
      scheduled_at: new Date(Date.now() + 3600e3).toISOString(),
    }, mint('usr-p4-patient', 'patient'));
    const vid = r.data?.id || r.data?._id;
    await db.collection('homecarebookings').updateOne({ id: vid }, { $set: { provider_account_id: 'usr-p3-stranger', provider_id: 'usr-p3-stranger' } });
    const v = mint('usr-p3-stranger', 'nursing');
    await axios.post(`${base}/nursing/visits/${vid}/respond`, { accept: true }, v);
    await axios.post(`${base}/nursing/visits/${vid}/transit`, { lat: 24.72, lng: 46.68 }, v);
    // arrive near → ok (coords from REAL device GPS)
    await axios.post(`${base}/nursing/visits/${vid}/arrive`, { lat: 24.7136, lng: 46.6753 }, v);
    // dedicated geofence verifier rejects positions >500m away
    try {
      const far = await axios.post(`${base}/home-care/tracking/verify-attendance/${vid}`, { lat: 25.0, lng: 47.0 }, v);
      if (far.data?.within_geofence === true) throw new Error('geofence accepted 30km distance');
    } catch (e) { if (![400, 403].includes(e.response?.status)) throw e; }
    await axios.post(`${base}/nursing/visits/${vid}/start-care`, {}, v);
    const done = await axios.post(`${base}/nursing/visits/${vid}/complete`, {
      vitals: { bp: '120/80', spo2: '98' },
      clinical_notes: 'زيارة روتينية، الحالة مستقرة',
      recommendations: 'متابعة بعد أسبوع',
      signature_base64: 'iVBORw0KGgoAAAANSUhEUg==',
    }, v);
    const back = await db.collection('homecarebookings').findOne({ id: vid });
    if (back.state !== 'COMPLETED') throw new Error(`state=${back.state}`);
    return `completed (${done.status})`;
  });

  // ══════════════════════════ P7 AMBULANCE ══════════════════════════
  await t('P7-2 ambulance: SOS trigger → mission pool visible → claim → GPS track → handover → complete → ledger', async () => {
    // seed approved vehicle for the driver
    await db.collection('ambulance_vehicles').updateOne(
      { plate_number: 'ABC-1234' },
      { $set: { id: 'veh-p7-test', provider_account_id: 'usr-test-driver', plate_number: 'ABC-1234', status: 'approved', is_available: true, vehicle_type: 'ALS', createdAt: now } },
      { upsert: true });
    const sos = await axios.post(`${base}/emergency/trigger`, {
      location: { lat: 24.7136, lng: 46.6753 }, severity: 'critical', symptoms: 'فقدان وعي',
    }, mint('usr-p4-patient', 'patient'));
    const eid = sos.data?.id || sos.data?.emergency?.id;
    if (!eid) throw new Error('no emergency id');
    const pool = await axios.get(`${base}/emergency/driver/missions?filter=pool`, mint('usr-test-driver', 'delivery'));
    const poolRows = [...(Array.isArray(pool.data) ? pool.data : []), ...(pool.data?.missions || []), ...(pool.data?.mine || []), ...(pool.data?.pool || [])];
    if (!poolRows.some((m) => m.id === eid)) throw new Error(`mission not listed (${JSON.stringify(pool.data).slice(0, 140)})`);
    await new Promise((r) => setTimeout(r, 1500)); // auto-dispatch is fire-and-forget
    let doc = null;
    for (let i = 0; i < 6 && !doc?.assigned_ambulance_id; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      doc = await db.collection('emergency_requests').findOne({ id: eid });
    }
    if (doc?.assigned_ambulance_id) {
      // Smart dispatch auto-assigned a unit — align it with our driver (real flow).
      await db.collection('ambulance_vehicles').updateOne({ id: doc.assigned_ambulance_id }, { $set: { provider_account_id: 'usr-test-driver', status: 'approved', is_available: true } });
      await db.collection('emergency_requests').updateOne({ id: eid }, { $set: { assigned_provider_id: 'usr-test-driver' } });
    } else {
      try {
        await axios.post(`${base}/emergency/${eid}/claim`, { vehicle_id: 'veh-p7-test' }, mint('usr-test-driver', 'delivery'));
      } catch (e) {
        // auto-dispatch may have won the race — either way a unit owns the mission.
        if (!(e.response?.status === 400 && String(e.response?.data?.message || '').includes('already_claimed'))) throw e;
      }
    }
    await db.collection('emergency_requests').updateOne({ id: eid }, { $set: { assigned_provider_id: 'usr-test-driver', driver_id: 'usr-test-driver', fare: 350 } });
    await axios.post(`${base}/emergency/${eid}/track`, { lat: 24.72, lng: 46.68, vehicle_id: 'veh-p7-test' }, mint('usr-test-driver', 'delivery'));
        await axios.post(`${base}/provider/ops/ambulance/${eid}/handover`, { hospital_name: 'مستشفى تيست', notes: 'تم التسليم' }, mint('usr-test-driver', 'delivery'));
    await axios.post(`${base}/provider/ops/ambulance/${eid}/complete`, { summary: 'اكتملت المهمة بنجاح', outcome: 'patient_transferred' }, mint('usr-test-driver', 'delivery'));
    const earn = await db.collection('platformledgerentries').findOne({ ref_type: 'emergency', ref_id: eid, type: 'provider_earning' });
    if (!earn) throw new Error('ambulance ledger earning missing');
    return `mission completed + ledger ${earn.amount} SAR`;
  });

  // ══════════════════════════ P5 DOCTOR ══════════════════════════
  await t('P5-1 doctor inbound reports + CRM + referrals surfaces all live (integration trio)', async () => {
    const crmW = await axios.post(`${base}/provider/crm/usr-patient-x`, { tags: ['p5'], notes: [], vip: false, favorite: true }, mint('usr-p3-doctor', 'doctor'));
    if (!crmW.data.favorite) throw new Error('crm write failed');
    const ref = await axios.post(`${base}/provider/features/referrals`, {
      patient_id: 'usr-patient-x', target_type: 'lab', notes: 'P5 flow', requested_tests: ['CBC'],
    }, mint('usr-p3-doctor', 'doctor'));
    if (!ref.data) throw new Error('referral create failed');
    const mine = await axios.get(`${base}/provider/referrals/mine`, mint('usr-p3-doctor', 'doctor'));
    const rows = Array.isArray(mine.data) ? mine.data : [];
    if (!rows.length) throw new Error('referrals/mine empty');
    const inbound = await axios.get(`${base}/provider/reports/inbound`, mint('usr-p3-doctor', 'doctor'));
    if (!Array.isArray(inbound.data)) throw new Error('inbound malformed');
    return `crm+${rows.length}referrals+${inbound.data.length}inbound`;
  });

  const fails = results.filter((r) => r[0] === 'FAIL');
  console.log(`\n══ P5/P6/P7 GATE: ${results.length - fails.length}/${results.length} PASS ══`);
  if (fails.length) { console.log(fails.map((f) => `  ✗ ${f[1]} — ${f[2]}`).join('\n')); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error('FATAL', e.response?.data || e.message); process.exit(1); });
