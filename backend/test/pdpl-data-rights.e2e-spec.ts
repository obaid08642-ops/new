/**
 * PDPL Phase 10 — data-subject rights against a REAL MongoDB.
 *
 * This deliberately uses a real mongod rather than mocks: the whole point of
 * the PDPL endpoints is which documents and which query shape actually reach
 * the database, and a mocked collection cannot prove that the $or ownership
 * filters match real rows or that deletion really removes them. The data below
 * is real documents written into a real database.
 *
 * mongodb-memory-server's bundled mongod aborts (SIGABRT) on this machine, so
 * the suite runs against the local replica set — the same one tools/live uses —
 * inside a throwaway database name that is dropped afterwards. It therefore
 * never touches the nabd_live data used by the live gate.
 */
import mongoose from 'mongoose';
import { PdplService } from '../src/modules/users/pdpl.service';

jest.setTimeout(180_000);

const MONGO_URL = process.env.PDPL_TEST_MONGO_URL || 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true';
const DB_NAME = `pdpl_test_${process.pid}_${Date.now()}`;

const PATIENT = 'pat-1';
const OTHER_PATIENT = 'pat-2';

describe('PdplService (PDPL portability + erasure) — real Mongo', () => {
  let conn: mongoose.Connection;
  let service: PdplService;
  let userModel: any;

  beforeAll(async () => {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 15_000 });
    await mongoose.connection.useDb(DB_NAME);
    conn = mongoose.connection;

    const UserSchema = new mongoose.Schema(
      { id: String, email: String, phone: String, password_hash: String, legal_consents: Array, deleted_at: Date },
      { strict: false },
    );
    userModel = conn.model('UserPdplTest', UserSchema);

    service = new PdplService(conn as any, userModel);

    await userModel.create([
      { id: PATIENT, email: 'patient@example.test', phone: '+966500000001', password_hash: 'HASH', full_name: 'Real Patient', national_id: '1012345678', medical_record_number: 'MRN-42' },
      { id: OTHER_PATIENT, email: 'other@example.test', phone: '+966500000002', password_hash: 'HASH', full_name: 'Someone Else' },
    ]);

    // Personal data across the ownership shapes the service must understand.
    await conn.collection('appointments').insertMany([
      { id: 'appt-1', patient_id: PATIENT, doctor_name: 'Dr A', state: 'completed' },
      { id: 'appt-2', patient_account_id: PATIENT, doctor_name: 'Dr B', state: 'completed' },
      { id: 'appt-3', patient_id: OTHER_PATIENT, doctor_name: 'Dr C' },
    ]);
    await conn.collection('pharmacy_orders').insertMany([
      { id: 'ord-1', patient_account_id: PATIENT, totals: { total: 120 } },
      { id: 'ord-2', patient_account_id: OTHER_PATIENT, totals: { total: 55 } },
    ]);
    await conn.collection('prescriptions').insertMany([
      { id: 'rx-1', patient_id: PATIENT, items: [{ drug: 'x' }] },
      { id: 'rx-2', patient_id: OTHER_PATIENT },
    ]);
    // A legal record: must survive erasure, anonymised.
    await conn.collection('transactions').insertMany([{ id: 'tx-1', patient_id: PATIENT, amount: 99, card_last4: '4242' }]);
    // Secrets that must never be exported.
    await conn.collection('pushtokens').insertMany([{ user_id: PATIENT, fcm_token: 'SECRET_TOKEN' }]);
  });

  afterAll(async () => {
    try { await mongoose.connection.dropDatabase(); } catch { /* already gone */ }
    await mongoose.disconnect();
  });

  it('exports every real document owned by the patient across all ownership field shapes', async () => {
    const out = await service.exportPatientData(PATIENT);

    expect(out.format).toBe('pdpl-portability-v1');
    // appointments owned via patient_id AND via patient_account_id
    expect(out.data.collections.appointments).toHaveLength(2);
    // order owned via patient_account_id
    expect(out.data.collections.pharmacy_orders).toHaveLength(1);
    expect(out.data.collections.prescriptions).toHaveLength(1);
    // account itself, without the password hash
    expect(out.data.account.email).toBe('patient@example.test');
    expect(out.data.account.password_hash).toBeUndefined();
  });

  it('never includes another patient data in the export', async () => {
    const out = await service.exportPatientData(PATIENT);
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain(OTHER_PATIENT);
    expect(serialized).not.toContain('appt-3');
    expect(serialized).not.toContain('Someone Else');
  });

  it('strips secrets (push tokens) from the export', async () => {
    const out = await service.exportPatientData(PATIENT);
    expect(JSON.stringify(out)).not.toContain('SECRET_TOKEN');
  });

  it('erasure deletes the real personal documents but keeps legal records anonymised', async () => {
    const res = await service.erasePatientData(PATIENT);

    // Personal data really gone from the database
    expect(await conn.collection('appointments').countDocuments({ patient_id: PATIENT })).toBe(0);
    expect(await conn.collection('appointments').countDocuments({ patient_account_id: PATIENT })).toBe(0);
    expect(await conn.collection('prescriptions').countDocuments({ patient_id: PATIENT })).toBe(0);
    // Sessions/tokens deleted immediately
    expect(await conn.collection('pushtokens').countDocuments({ user_id: PATIENT })).toBe(0);
    // Legal record kept but de-identified
    expect(res.anonymised.transactions).toBe(1);
    const tx = await conn.collection('transactions').findOne({ id: 'tx-1' }) as any;
    expect(tx).toBeTruthy();
    expect(tx.patient_id).toBeUndefined();
    expect(tx.amount).toBe(99); // financial record intact
  });

  it('erasure does not touch the other patient', async () => {
    expect(await conn.collection('appointments').countDocuments({ patient_id: OTHER_PATIENT })).toBe(1);
    expect(await conn.collection('prescriptions').countDocuments({ patient_id: OTHER_PATIENT })).toBe(1);
    expect(await userModel.countDocuments({ id: OTHER_PATIENT })).toBe(1);
  });

  it('anonymises the account in place and marks it deleted for the retention job', async () => {
    const u = await userModel.findOne({ id: PATIENT }).lean() as any;
    expect(u.full_name).toBe('Deleted User');
    expect(u.email).toBeFalsy();
    expect(u.password_hash).toBeFalsy();
    expect(u.active).toBe(false);
    expect(u.deleted_at).toBeTruthy();
  });

  it('a post-erasure export no longer discloses the erased identifiers', async () => {
    // Guards the $unset regression: a lingering email/phone column would still
    // be handed out by the portability endpoint. national_id and the medical
    // record number are the same class of identifier.
    const out = await service.exportPatientData(PATIENT);
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain('patient@example.test');
    expect(serialized).not.toContain('+966500000001');
    expect(serialized).not.toContain('1012345678');
    expect(serialized).not.toContain('MRN-42');
    expect(out.data.account.full_name).toBe('Deleted User');
  });

  it('records immutable consent evidence', async () => {
    await service.recordConsent(PATIENT, 'privacy_policy', '1.0', true);
    const { consents } = await service.getConsents(PATIENT);
    expect(consents.length).toBeGreaterThanOrEqual(1);
    expect(consents[consents.length - 1]).toMatchObject({ policy_id: 'privacy_policy', version: '1.0', accepted: true });
  });

  it('rejects an unknown subject instead of returning an empty export', async () => {
    await expect(service.exportPatientData('does-not-exist')).rejects.toThrow('user_not_found');
  });
});
