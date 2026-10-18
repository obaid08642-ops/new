import mongoose, { type Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { encryptCollection } from './encrypt-health-fields';
import { resetFieldCrypto } from '../common/pdpl-compliance.module';
import { revealHealthDoc } from '../common/health-fields';

jest.setTimeout(120_000);
const KEY = Buffer.alloc(32, 5).toString('base64');

describe('16.9 migration of existing health rows', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let db: mongoose.mongo.Db;
  const previous = process.env.FIELD_ENCRYPTION_KEY;
  beforeAll(async () => {
    process.env.FIELD_ENCRYPTION_KEY = KEY; resetFieldCrypto();
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'mig' }).asPromise();
    db = conn.db as mongoose.mongo.Db;
  });
  afterAll(async () => {
    if (previous === undefined) delete process.env.FIELD_ENCRYPTION_KEY; else process.env.FIELD_ENCRYPTION_KEY = previous;
    resetFieldCrypto();
    await conn?.close(); await mongo?.stop();
  });
  beforeEach(async () => { await db.collection('prescriptions').deleteMany({}); await db.collection('appointments').deleteMany({}); });

  it('a dry run counts and writes nothing', async () => {
    await db.collection('prescriptions').insertMany([{ id: 'a', patient_id: 'p', diagnosis: 'flu', items: [{ instructions: 'x' }] }, { id: 'b', patient_id: 'p', items: [] }]);
    const r = await encryptCollection(db, 'prescriptions', { apply: false });
    expect(r).toMatchObject({ scanned: 2, plaintext_rows: 1, encrypted: 0 });
    expect((await db.collection('prescriptions').findOne({ id: 'a' }))?.diagnosis).toBe('flu');
  });

  it('apply encrypts every plaintext health field, keeps the rest, verifies by reading back, and is idempotent', async () => {
    await db.collection('prescriptions').insertMany([
      { id: 'a', patient_id: 'p', diagnosis: 'flu', notes: 'rest', items: [{ medicine_name_en: 'M', instructions: 'after meals', dose: '1' }] },
      { id: 'c', patient_id: 'q', diagnosis: 'asthma', items: [] },
    ]);
    await db.collection('appointments').insertOne({ id: 'ap', patient_id: 'p', status: 'COMPLETED', summary: { diagnosis: 'd', notes: 'n', follow_up_recommended: true }, patient_notes: 'cough', sickLeaves: [{ days: 2, reason: 'flu' }] });
    const first = await encryptCollection(db, 'prescriptions', { apply: true });
    expect(first).toMatchObject({ scanned: 2, plaintext_rows: 2, encrypted: 2, skipped_concurrent: 0 });
    await encryptCollection(db, 'appointments', { apply: true });
    const rx: any = await db.collection('prescriptions').findOne({ id: 'a' });
    expect(rx.diagnosis).toMatch(/^enc\.v1:/);
    expect(rx.notes).toMatch(/^enc\.v1:/);
    expect(rx.items[0].instructions).toMatch(/^enc\.v1:/);
    expect(rx.items[0]).toMatchObject({ medicine_name_en: 'M', dose: '1' });
    expect(rx.patient_id).toBe('p');
    const ap: any = await db.collection('appointments').findOne({ id: 'ap' });
    expect(ap.summary.diagnosis).toMatch(/^enc\.v1:/);
    expect(ap.summary.follow_up_recommended).toBe(true);
    expect(ap.sickLeaves[0]).toMatchObject({ days: 2 });
    expect(ap.sickLeaves[0].reason).toMatch(/^enc\.v1:/);
    expect(ap.status).toBe('COMPLETED');
    expect(revealHealthDoc('prescriptions', rx).diagnosis).toBe('flu');
    // second run: nothing left to do
    expect(await encryptCollection(db, 'prescriptions', { apply: true })).toMatchObject({ scanned: 2, plaintext_rows: 0, encrypted: 0 });
  });

  it('refuses to run without the key', async () => {
    delete process.env.FIELD_ENCRYPTION_KEY; resetFieldCrypto();
    try { await expect(encryptCollection(db, 'prescriptions', { apply: true })).rejects.toThrow('FIELD_ENCRYPTION_KEY'); }
    finally { process.env.FIELD_ENCRYPTION_KEY = KEY; resetFieldCrypto(); }
  });
});
