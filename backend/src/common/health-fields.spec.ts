/**
 * Phase 16.9 - the plan's two Verify cases for the field layer:
 *   - the raw database field is ciphertext (read through the driver, not the model);
 *   - the model gives plaintext back in every shape a caller can ask for it.
 */
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PrescriptionSchema } from '../schemas/prescription.schema';
import { MedicalReportSchema } from '../schemas/medical-report.schema';
import { AppointmentSchema } from '../schemas/appointment.schema';
import { protectHealthDoc, revealHealthDoc, HEALTH_FIELDS } from './health-fields';
import { resetFieldCrypto, FieldEncryptionService } from './pdpl-compliance.module';

jest.setTimeout(120_000);
const KEY = Buffer.alloc(32, 9).toString('base64');
const OLD_KEY = Buffer.alloc(32, 3).toString('base64');
const CIPHER = /^enc\.v1:/;

describe('Phase 16.9 health fields in the database', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let Rx: Model<any>;
  let Report: Model<any>;
  let Appt: Model<any>;
  const previous = { key: process.env.FIELD_ENCRYPTION_KEY, prev: process.env.FIELD_ENCRYPTION_KEY_PREVIOUS };

  beforeAll(async () => {
    process.env.FIELD_ENCRYPTION_KEY = KEY;
    delete process.env.FIELD_ENCRYPTION_KEY_PREVIOUS;
    resetFieldCrypto();
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'hf' }).asPromise();
    Rx = conn.model('Prescription', PrescriptionSchema) as Model<any>;
    Report = conn.model('MedicalReport', MedicalReportSchema) as Model<any>;
    Appt = conn.model('Appointment', AppointmentSchema) as Model<any>;
  });
  afterAll(async () => {
    for (const [k, v] of [['FIELD_ENCRYPTION_KEY', previous.key], ['FIELD_ENCRYPTION_KEY_PREVIOUS', previous.prev]] as const) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    resetFieldCrypto();
    await conn?.close();
    await mongo?.stop();
  });
  beforeEach(async () => { await Promise.all([Rx.deleteMany({}), Report.deleteMany({}), Appt.deleteMany({})]); });

  const raw = (collection: string, filter: Record<string, unknown> = {}) => conn.collection(collection).findOne(filter);

  it('a prescription: diagnosis, notes and dosing instructions are ciphertext in the raw document', async () => {
    const saved = await new Rx({ patient_id: 'p1', diagnosis: 'Type 2 diabetes', notes: 'HbA1c 9.1', items: [{ medicine_name_en: 'Metformin', instructions: 'after meals' }] }).save();
    const r: any = await raw('prescriptions');
    expect(r.diagnosis).toMatch(CIPHER);
    expect(r.notes).toMatch(CIPHER);
    expect(r.items[0].instructions).toMatch(CIPHER);
    expect(JSON.stringify(r)).not.toMatch(/diabetes|HbA1c|after meals/);
    expect(r.patient_id).toBe('p1');                 // the lookup keys stay readable
    expect(r.items[0].medicine_name_en).toBe('Metformin');
    // the document that was just saved still reads as plaintext, in memory and as an object
    expect(saved.diagnosis).toBe('Type 2 diabetes');
    expect((saved.toObject() as any).diagnosis).toBe('Type 2 diabetes');
    expect(JSON.parse(JSON.stringify(saved)).items[0].instructions).toBe('after meals');
  });

  it('reads return plaintext: hydrated, lean, aggregate, findOneAndUpdate', async () => {
    await new Rx({ patient_id: 'p2', diagnosis: 'asthma', notes: 'inhaler', items: [{ instructions: 'twice daily' }] }).save();
    const hydrated: any = await Rx.findOne({ patient_id: 'p2' });
    expect(hydrated.diagnosis).toBe('asthma');
    expect((hydrated.toObject() as any).items[0].instructions).toBe('twice daily');
    const lean: any = await Rx.findOne({ patient_id: 'p2' }).lean();
    expect(lean.diagnosis).toBe('asthma');
    expect(lean.items[0].instructions).toBe('twice daily');
    const many: any[] = await Rx.find({ patient_id: 'p2' }).lean();
    expect(many[0].notes).toBe('inhaler');
    const agg: any[] = await Rx.aggregate([{ $match: { patient_id: 'p2' } }]);
    expect(agg[0].diagnosis).toBe('asthma');
    const updated: any = await Rx.findOneAndUpdate({ patient_id: 'p2' }, { $set: { diagnosis: 'COPD' } }, { new: true });
    expect(updated.diagnosis).toBe('COPD');
    expect((await raw('prescriptions')).diagnosis).toMatch(CIPHER);
  });

  it('updates through the model encrypt too ($set, updateOne, insertMany)', async () => {
    await Rx.insertMany([{ patient_id: 'p3', diagnosis: 'migraine' }]);
    expect((await raw('prescriptions', { patient_id: 'p3' })).diagnosis).toMatch(CIPHER);
    await Rx.updateOne({ patient_id: 'p3' }, { $set: { notes: 'rest' } });
    expect((await raw('prescriptions', { patient_id: 'p3' })).notes).toMatch(CIPHER);
    expect(((await Rx.findOne({ patient_id: 'p3' }).lean()) as any).notes).toBe('rest');
  });

  it('a medical report and the appointment summary', async () => {
    await new Report({ patient_id: 'p4', title_ar: 'تقرير', summary: 'short', body: 'long note', diagnosis: 'anemia', recommendations: 'iron', patient_name: 'Ali Test' }).save();
    const r: any = await raw('medicalreports');
    for (const f of ['summary', 'body', 'diagnosis', 'recommendations', 'patient_name']) expect(r[f]).toMatch(CIPHER);
    expect(r.title_ar).toBe('تقرير');
    await new Appt({ patient_id: 'p4', doctor_id: 'd1', doctor_user_id: 'du1', price: 100, service_type: 'clinic', slot_start: new Date(), slot_end: new Date(), summary: { diagnosis: 'flu', notes: 'rest', recommendations: 'fluids', follow_up_recommended: true }, patient_notes: 'cough since Monday' }).save();
    const a: any = await raw('appointments');
    {
      expect(a.summary.diagnosis).toMatch(CIPHER);
      expect(a.summary.notes).toMatch(CIPHER);
      expect(a.patient_notes).toMatch(CIPHER);
      expect(a.summary.follow_up_recommended).toBe(true);
      const back: any = await Appt.findOne({ patient_id: 'p4' }).lean();
      expect(back.summary.diagnosis).toBe('flu');
      expect(back.patient_notes).toBe('cough since Monday');
    }
  });

  it('the appointment summary written the way finish() writes it (assigned on a loaded document) is ciphertext, and getSummary-style reads see plaintext', async () => {
    await new Appt({ patient_id: 'p9', doctor_id: 'd1', doctor_user_id: 'du1', price: 100, service_type: 'clinic', slot_start: new Date(), slot_end: new Date() }).save();
    const doc: any = await Appt.findOne({ patient_id: 'p9' });
    doc.summary = { diagnosis: 'viral pharyngitis', notes: 'rest and fluids', recommendations: 'review in a week', prescription: [{ name: 'Paracetamol', dose: '500mg' }], follow_up_recommended: true, written_at: new Date() };
    doc.patient_notes = 'sore throat';
    doc.sickLeaves = [{ days: 2, reason: 'viral pharyngitis' }];
    await doc.save();
    const stored: any = await raw('appointments', { patient_id: 'p9' });
    for (const v of [stored.summary.diagnosis, stored.summary.notes, stored.summary.recommendations, stored.patient_notes, stored.sickLeaves[0].reason]) expect(v).toMatch(CIPHER);
    expect(stored.summary.prescription[0].name).toBe('Paracetamol');
    const loaded: any = await Appt.findOne({ patient_id: 'p9' });
    const summary = loaded.toObject().summary;                 // what AppointmentsService.getSummary reads
    expect(summary.diagnosis).toBe('viral pharyngitis');
    expect(summary.prescription[0].name).toBe('Paracetamol');
    expect(summary.follow_up_recommended).toBe(true);
    expect(loaded.summary.notes).toBe('rest and fluids');
    expect(JSON.parse(JSON.stringify(loaded)).sickLeaves[0].reason).toBe('viral pharyngitis');
  });

  it('a row written before the migration (plaintext) still reads, and is encrypted by the next save', async () => {
    await conn.collection('prescriptions').insertOne({ id: 'old', patient_id: 'p5', diagnosis: 'old plaintext diagnosis', items: [] });
    const lean: any = await Rx.findOne({ patient_id: 'p5' }).lean();
    expect(lean.diagnosis).toBe('old plaintext diagnosis');
    const doc: any = await Rx.findOne({ patient_id: 'p5' });
    doc.diagnosis = 'updated';
    await doc.save();
    expect((await raw('prescriptions', { patient_id: 'p5' })).diagnosis).toMatch(CIPHER);
  });

  it('ciphertext cannot be read without the key (never shown as the fallback)', async () => {
    await new Rx({ patient_id: 'p6', diagnosis: 'secret' }).save();
    delete process.env.FIELD_ENCRYPTION_KEY;
    resetFieldCrypto();
    try {
      await expect(Rx.findOne({ patient_id: 'p6' }).lean()).rejects.toThrow('field_encryption_key_missing');
    } finally {
      process.env.FIELD_ENCRYPTION_KEY = KEY;
      resetFieldCrypto();
    }
  });

  it('after a key rotation the old ciphertext still reads and new writes use the new key', async () => {
    process.env.FIELD_ENCRYPTION_KEY = OLD_KEY; resetFieldCrypto();
    await new Rx({ patient_id: 'p7', diagnosis: 'before rotation' }).save();
    process.env.FIELD_ENCRYPTION_KEY = KEY; process.env.FIELD_ENCRYPTION_KEY_PREVIOUS = OLD_KEY; resetFieldCrypto();
    try {
      expect(((await Rx.findOne({ patient_id: 'p7' }).lean()) as any).diagnosis).toBe('before rotation');
      await new Rx({ patient_id: 'p8', diagnosis: 'after rotation' }).save();
      process.env.FIELD_ENCRYPTION_KEY = OLD_KEY; delete process.env.FIELD_ENCRYPTION_KEY_PREVIOUS; resetFieldCrypto();
      await expect(Rx.findOne({ patient_id: 'p8' }).lean()).rejects.toThrow('field_decryption_failed');   // encrypted with the new key only
    } finally {
      process.env.FIELD_ENCRYPTION_KEY = KEY; delete process.env.FIELD_ENCRYPTION_KEY_PREVIOUS; resetFieldCrypto();
    }
  });
});

describe('Phase 16.9 raw collection helpers', () => {
  beforeAll(() => { process.env.FIELD_ENCRYPTION_KEY = KEY; resetFieldCrypto(); });
  afterAll(() => { delete process.env.FIELD_ENCRYPTION_KEY; resetFieldCrypto(); });

  it('protect then reveal round-trips every registered path and leaves the rest alone', () => {
    const rx = { patient_id: 'p', diagnosis: 'd', notes: 'n', items: [{ instructions: 'i1', dose: '1' }, { instructions: 'i2' }] };
    const copy = JSON.parse(JSON.stringify(rx));
    protectHealthDoc('prescriptions', copy);
    expect(copy.diagnosis).toMatch(CIPHER);
    expect(copy.items[0].instructions).toMatch(CIPHER);
    expect(copy.items[1].instructions).toMatch(CIPHER);
    expect(copy.patient_id).toBe('p');
    expect(copy.items[0].dose).toBe('1');
    expect(revealHealthDoc('prescriptions', copy)).toEqual(rx);
  });

  it('nested summary and a missing path are handled', () => {
    const appt: any = { summary: { diagnosis: 'x', notes: 'y' } };
    protectHealthDoc('appointments', appt);
    expect(appt.summary.diagnosis).toMatch(CIPHER);
    expect(() => protectHealthDoc('appointments', { id: 1 })).not.toThrow();
    expect(() => protectHealthDoc('unknown', { diagnosis: 'x' })).not.toThrow();
    expect(HEALTH_FIELDS.prescriptions).toContain('diagnosis');
  });
});
