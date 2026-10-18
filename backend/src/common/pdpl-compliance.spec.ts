/**
 * Phase 16.9 — health data protection under the PDPL.
 * The plan's two Verify cases:
 *   - the raw database field is ciphertext;
 *   - every read of a medical record writes an access-log row.
 */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { FieldEncryptionService, MedicalAccessLogService } from './pdpl-compliance.module';

jest.setTimeout(120_000);
const KEY = Buffer.alloc(32, 7).toString('base64');

describe('Phase 16.9 field-level encryption', () => {
  const previous = process.env.FIELD_ENCRYPTION_KEY;

  afterEach(() => {
    if (previous === undefined) delete process.env.FIELD_ENCRYPTION_KEY;
    else process.env.FIELD_ENCRYPTION_KEY = previous;
  });

  it('the raw field in the database is ciphertext, never the readable text', () => {
    process.env.FIELD_ENCRYPTION_KEY = KEY;
    const crypto = new FieldEncryptionService();
    expect(crypto.isEnabled()).toBe(true);

    const plain = 'Type 2 diabetes — metformin 500mg, twice daily';
    const stored = crypto.encrypt(plain);
    expect(stored).not.toContain('diabetes');
    expect(stored).not.toContain('metformin');
    expect(stored.startsWith('enc.v1:')).toBe(true);
    expect(crypto.decrypt(stored)).toBe(plain);
  });

  it('two encryptions of the same text differ (random IV) and both decrypt', () => {
    process.env.FIELD_ENCRYPTION_KEY = KEY;
    const crypto = new FieldEncryptionService();
    const a = crypto.encrypt('diagnosis');
    const b = crypto.encrypt('diagnosis');
    expect(a).not.toBe(b);
    expect(crypto.decrypt(a)).toBe('diagnosis');
    expect(crypto.decrypt(b)).toBe('diagnosis');
  });

  it('a tampered ciphertext fails instead of returning garbage', () => {
    process.env.FIELD_ENCRYPTION_KEY = KEY;
    const crypto = new FieldEncryptionService();
    const stored = crypto.encrypt('sensitive');
    const parts = stored.split(':');
    const data = Buffer.from(parts[3], 'base64url');
    data[0] ^= 0xff;
    const tampered = [parts[0], parts[1], parts[2], data.toString('base64url')].join(':');
    expect(() => crypto.decrypt(tampered)).toThrow('field_decryption_failed');
  });

  it('never double-encrypts and passes a non-string through', () => {
    process.env.FIELD_ENCRYPTION_KEY = KEY;
    const crypto = new FieldEncryptionService();
    const once = crypto.encrypt('x');
    expect(crypto.encrypt(once)).toBe(once);
    expect(crypto.encrypt('')).toBe('');
    expect(crypto.decrypt('plain text that was never encrypted')).toBe('plain text that was never encrypted');
  });

  it('is off, and says so, without a key — and refuses a wrong-length key', () => {
    delete process.env.FIELD_ENCRYPTION_KEY;
    const crypto = new FieldEncryptionService();
    expect(crypto.isEnabled()).toBe(false);
    expect(crypto.encrypt('x')).toBe('x');

    process.env.FIELD_ENCRYPTION_KEY = 'too-short';
    expect(() => new FieldEncryptionService()).toThrow('FATAL');
  });

  it('encrypts and decrypts a set of named fields', () => {
    process.env.FIELD_ENCRYPTION_KEY = KEY;
    const crypto = new FieldEncryptionService();
    const doc = { id: 'r1', title: 'Visit', diagnosis: 'asthma', body: 'notes', critical: false };
    const enc = crypto.encryptFields({ ...doc }, ['diagnosis', 'body']);
    expect(enc.diagnosis).toMatch(/^enc\.v1:/);
    expect(enc.body).toMatch(/^enc\.v1:/);
    expect(enc.title).toBe('Visit');
    const dec = crypto.decryptFields(enc, ['diagnosis', 'body']);
    expect(dec.diagnosis).toBe('asthma');
    expect(dec.body).toBe('notes');
  });
});

describe('Phase 16.9 medical access log', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let crypto: FieldEncryptionService;
  let log: MedicalAccessLogService;
  const previous = process.env.FIELD_ENCRYPTION_KEY;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'pdpl' }).asPromise();
    process.env.FIELD_ENCRYPTION_KEY = KEY;
    crypto = new FieldEncryptionService();
    log = new MedicalAccessLogService(conn, crypto);
  });
  afterAll(async () => {
    if (previous === undefined) delete process.env.FIELD_ENCRYPTION_KEY;
    else process.env.FIELD_ENCRYPTION_KEY = previous;
    await conn.close();
    await mongo.stop();
  });

  beforeEach(async () => {
    await conn.collection('medical_access_logs').deleteMany({});
  });

  it('every read writes a row naming who read which record', async () => {
    await log.record(
      { actor_id: 'doctor-1', actor_role: 'doctor', actor_kind: 'provider', ip: '10.0.0.5', device_id: 'dev-1', user_agent: 'jest' },
      { kind: 'medical_report', id: 'report-42', action: 'read' },
    );
    const rows = await conn.collection('medical_access_logs').find({}).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].actor_id).toBe('doctor-1');
    expect(rows[0].actor_kind).toBe('provider');
    expect(rows[0].record_kind).toBe('medical_report');
    expect(rows[0].action).toBe('read');
    // the record id and the IP are ciphertext at rest, too
    expect(rows[0].record_id).toMatch(/^enc\.v1:/);
    expect(rows[0].ip).toMatch(/^enc\.v1:/);
  });

  it('the patient sees who looked at THEIR records (and nobody else\'s); the admin sees all, narrowed by filters', async () => {
    await log.record({ actor_id: 'doctor-1', actor_role: 'doctor', actor_kind: 'provider' }, { kind: 'lab_result', id: 'l1', subject_id: 'p1' });
    await log.record({ actor_id: 'doctor-2', actor_role: 'doctor', actor_kind: 'provider' }, { kind: 'lab_result', id: 'l2', subject_id: 'p2' });
    await log.record({ actor_id: 'p1', actor_role: 'patient', actor_kind: 'patient' }, { kind: 'medical_report', id: 'r9', subject_id: 'p1' });

    const adminView = await log.timeline({ id: 'admin-1', role: 'admin' });
    expect(adminView.map((r) => r.record_id).sort()).toEqual(['l1', 'l2', 'r9']);
    expect((await log.timeline({ id: 'admin-1', role: 'admin' }, { patient_id: 'p2' })).map((r) => r.record_id)).toEqual(['l2']);
    expect((await log.timeline({ id: 'admin-1', role: 'admin' }, { actor_id: 'doctor-1' })).map((r) => r.record_id)).toEqual(['l1']);

    const patientView = await log.timeline({ id: 'p1', role: 'patient' });
    expect(patientView.map((r) => r.record_id).sort()).toEqual(['l1', 'r9']);          // the doctor who read p1's result, and p1's own read
    expect(patientView.some((r) => r.record_id === 'l2')).toBe(false);                  // never another patient's
    // a patient cannot widen the view with a filter
    expect((await log.timeline({ id: 'p1', role: 'patient' }, { patient_id: 'p2', actor_id: 'doctor-2' })).map((r) => r.record_id).sort()).toEqual(['l1', 'r9']);
  });

  it('recordMany writes one row per record, and the ip / user agent / device come from the request context', async () => {
    const { runWithLogContext } = await import('./structured-logger');
    await runWithLogContext({ requestId: 'req-77', ip: '10.9.8.7', userAgent: 'jest-ua', deviceId: 'dev-9' }, () =>
      log.recordMany({ actor_id: 'doctor-3', actor_role: 'doctor', actor_kind: 'provider' }, [
        { kind: 'prescription', id: 'rx1', action: 'list', subject_id: 'p5' },
        { kind: 'prescription', id: 'rx2', action: 'list', subject_id: 'p5' },
      ]),
    );
    const rows = await conn.collection('medical_access_logs').find({}).toArray();
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.ip).toMatch(/^enc\.v1:/);
      expect(r.user_agent).toBe('jest-ua');
      expect(r.device_id).toBe('dev-9');
      expect(r.request_id).toBe('req-77');
      expect(r.subject_id).toBe('p5');
    }
    const view = await log.timeline({ id: 'p5', role: 'patient' });
    expect(view.map((r) => r.ip)).toEqual(['10.9.8.7', '10.9.8.7']);
  });

  it('logMedicalRead writes the row, never throws, and never breaks the caller when the write fails', async () => {
    const { logMedicalRead } = await import('./pdpl-compliance.module');
    await logMedicalRead(log, { id: 'doc-9', role: 'doctor' }, [{ kind: 'consultation_summary', id: 'a1', subject_id: 'p6' }]);
    expect((await log.timeline({ id: 'p6', role: 'patient' })).map((r) => [r.record_kind, r.actor_kind])).toEqual([['consultation_summary', 'provider']]);
    const broken = { record: async () => { throw new Error('mongo down'); }, recordMany: async () => { throw new Error('mongo down'); } } as unknown as MedicalAccessLogService;
    await expect(logMedicalRead(broken, { id: 'x', role: 'doctor' }, [{ kind: 'k', id: 'i' }])).resolves.toBeUndefined();
    await expect(logMedicalRead(undefined, { id: 'x', role: 'doctor' }, [{ kind: 'k', id: 'i' }])).resolves.toBeUndefined();
  });

  it('the collection has a retention TTL (default 5 years, configurable, never under 30 days) and the lookup indexes', async () => {
    const { medicalAccessLogRetentionDays } = await import('./pdpl-compliance.module');
    expect(medicalAccessLogRetentionDays({} as NodeJS.ProcessEnv)).toBe(1825);
    expect(medicalAccessLogRetentionDays({ MEDICAL_ACCESS_LOG_RETENTION_DAYS: '365' } as unknown as NodeJS.ProcessEnv)).toBe(365);
    expect(medicalAccessLogRetentionDays({ MEDICAL_ACCESS_LOG_RETENTION_DAYS: '3' } as unknown as NodeJS.ProcessEnv)).toBe(1825);
    await log.onModuleInit();
    const idx = await conn.collection('medical_access_logs').indexes();
    const ttl = idx.find((i) => i.name === 'created_at_ttl');
    expect(ttl?.expireAfterSeconds).toBe(1825 * 86400);
    expect(idx.map((i) => i.name)).toEqual(expect.arrayContaining(['subject_created', 'actor_created']));
  });
});
