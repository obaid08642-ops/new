import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NotFoundException } from '@nestjs/common';
import { AppointmentOutcomesService } from './appointment-outcomes.service';
import { resolveCodes, isNewOutcome } from './appointment-outcomes';
import { protectHealthDoc } from '../../common/health-fields';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
let svc: AppointmentOutcomesService;
const logged: any[] = [];
const accessLog: any = { record: async (_c: any, r: any) => { logged.push(r); }, recordMany: async (_c: any, rs: any[]) => { logged.push(...rs); } };
const me = { id: 'patient-1', role: 'patient' };
const other = { id: 'patient-2', role: 'patient' };
const oid = new mongoose.Types.ObjectId();
const T0 = new Date('2026-10-01T10:00:00Z');
const T1 = new Date('2026-10-02T10:00:00Z');

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'outcomes' });
  svc = new AppointmentOutcomesService(mongoose.connection, accessLog);
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

const db = () => mongoose.connection.db!;
const bookable = { active: true, is_deleted: false, public_eligibility: true, medical_review_status: 'approved' };

async function seed() {
  for (const c of ['appointments', 'prescriptions', 'medicalreports', 'encounterreferrals', 'lab_services', 'radiology_services', 'medical_orders']) await db().collection(c).deleteMany({});
  logged.length = 0;
  await db().collection('appointments').insertMany([
    { _id: oid, id: 'appt-1', patient_id: 'patient-1', doctor_id: 'doc-1', doctor_user_id: 'doc-user', status: 'completed', prescriptions: ['rx-1'],
      summary: { diagnosis: 'x', recommendations: 'rest and fluids', follow_up_recommended: true, follow_up_window_days: 14 } },
    { id: 'appt-2', patient_id: 'patient-1', status: 'completed' },
    { id: 'appt-3', patient_id: 'patient-2', status: 'completed' },
  ] as any);
  await db().collection('prescriptions').insertMany([
    protectHealthDoc('prescriptions', { id: 'rx-1', patient_id: 'patient-1', appointment_id: 'appt-1', state: 'created_by_doctor', diagnosis: 'flu', notes: 'n', createdAt: T1,
      items: [{ medicine_id: 'med-1', medicine_name_en: 'Panadol', dose: '1 tab', times_per_day: 3, duration_days: 5, instructions: 'after meals' }] }),
    { id: 'rx-other', patient_id: 'patient-2', appointment_id: 'appt-3', createdAt: T1, items: [] },
  ] as any);
  await db().collection('medicalreports').insertMany([
    protectHealthDoc('medicalreports', { id: 'mr-leave', tracking_id: 'MR-1', patient_id: 'patient-1', appointment_id: 'appt-1', report_type: 'medical_certificate', certificate_kind: 'sick_leave', title_ar: 'إجازة', title_en: 'Sick leave', summary: 'flu', diagnosis: 'flu', sick_leave: { duration_days: 3 }, viewed_by_patient: false, createdAt: T1, attachments: [{ base64: 'AAAA' }], body: 'secret body' }),
    protectHealthDoc('medicalreports', { id: 'mr-note', patient_id: 'patient-1', appointment_id: 'appt-1', report_type: 'clinic_note', title_ar: 'ملاحظة', summary: 'ok', viewed_by_patient: true, createdAt: T1 }),
    protectHealthDoc('medicalreports', { id: 'mr-elsewhere', patient_id: 'patient-1', appointment_id: 'appt-2', report_type: 'clinic_note', title_ar: 'x', createdAt: T1 }),
  ] as any);
  await db().collection('lab_services').insertMany([
    { id: 'lab-cbc', short_code: 'CBC', name_ar: 'صورة دم', name_en: 'Complete Blood Count', ...bookable },
    { id: 'lab-hidden', short_code: 'HID', name_en: 'Hidden', ...bookable, medical_review_status: 'pending' },
  ] as any);
  await db().collection('radiology_services').insertOne({ id: 'rad-xr', short_code: 'XR-CHEST', name_en: 'Chest X-Ray', ...bookable } as any);
  await db().collection('encounterreferrals').insertOne({ appointment_id: oid, patient_id: new mongoose.Types.ObjectId(), requested_lab_tests: ['cbc', 'HID', 'Unknown Test'], requested_radiology_scans: ['XR-CHEST'], createdAt: T1 } as any);
}

describe('GET /care/appointments/:id/outcomes', () => {
  beforeEach(seed);

  it('returns the visit: prescription (decrypted), resolved and unresolved tests, certificates, reports, instructions', async () => {
    const o = await svc.outcomes(me, 'appt-1');
    expect(o.prescriptions).toHaveLength(1);
    expect(o.prescriptions[0]).toMatchObject({ id: 'rx-1', diagnosis: 'flu', is_new: true });
    expect(o.prescriptions[0].items[0]).toMatchObject({ medicine_id: 'med-1', name_en: 'Panadol', instructions: 'after meals' });
    expect(o.lab_tests).toEqual([
      { code: 'cbc', resolved: true, id: 'lab-cbc', short_code: 'CBC', name_ar: 'صورة دم', name_en: 'Complete Blood Count' },
      { code: 'HID', resolved: false },                       // exists but the patient cannot book it
      { code: 'Unknown Test', resolved: false },
    ]);
    expect(o.radiology_scans).toEqual([{ code: 'XR-CHEST', resolved: true, id: 'rad-xr', short_code: 'XR-CHEST', name_ar: null, name_en: 'Chest X-Ray' }]);
    expect(o.sick_leaves_and_certificates.map((r) => r.id)).toEqual(['mr-leave']);
    expect(o.sick_leaves_and_certificates[0]).toMatchObject({ certificate_kind: 'sick_leave', summary: 'flu', sick_leave: { duration_days: 3 } });
    expect(o.reports.map((r) => r.id)).toEqual(['mr-note']);   // the other visit's report is not here
    expect(JSON.stringify(o)).not.toContain('secret body');    // list shape: no full body, no attachments
    expect(JSON.stringify(o)).not.toContain('AAAA');
    expect(o.instructions).toMatchObject({ recommendations: 'rest and fluids', follow_up_recommended: true, follow_up_window_days: 14 });
    expect(o.instructions.follow_up_actions).toEqual([{ kind: 'pharmacy_order', prescription_id: 'rx-1' }]);
  });

  it('another patient, a guest and an unknown id all get 404; operators in the id are not interpreted', async () => {
    await expect(svc.outcomes(other, 'appt-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.outcomes({ id: 'doc-user', role: 'doctor' }, 'appt-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.outcomes(me, 'nope')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.outcomes(me, { $ne: 'x' } as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.outcomes(me, 'appt-3')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.markSeen(other, 'appt-1')).rejects.toBeInstanceOf(NotFoundException);
    expect((await db().collection('appointments').findOne({ id: 'appt-1' }))!.outcomes_seen_at).toBeUndefined();
  });

  it('writes a medical-access row for every prescription and report it returns', async () => {
    await svc.outcomes(me, 'appt-1');
    expect(logged.map((r) => `${r.kind}:${r.id}`).sort()).toEqual(['medical_report:mr-leave', 'medical_report:mr-note', 'prescription:rx-1']);
  });
});

describe('the badge and the seen mark', () => {
  beforeEach(seed);

  it('counts the new outcomes: a prescription, an unread report, a referral; a read report does not count', async () => {
    const o = await svc.outcomes(me, 'appt-1');
    expect(o.unseen_count).toBe(3);                         // rx-1 + mr-leave (mr-note was read) + the referral
    const b = await svc.badge(me);
    // appt-2 holds one unread report of its own (mr-elsewhere)
    expect(b).toEqual({ unseen_total: 4, appointments: expect.arrayContaining([{ appointment_id: 'appt-1', unseen: 3 }, { appointment_id: 'appt-2', unseen: 1 }]) });
  });

  it('marking the visit seen clears its badge; an outcome issued later is new again', async () => {
    const seen = await svc.markSeen(me, 'appt-1');
    expect(seen.ok).toBe(true);
    expect(await svc.badge(me)).toEqual({ unseen_total: 1, appointments: [{ appointment_id: 'appt-2', unseen: 1 }] });   // only the other visit is left
    const o = await svc.outcomes(me, 'appt-1');
    expect(o.unseen_count).toBe(0);
    expect(o.prescriptions[0].is_new).toBe(false);
    await db().collection('prescriptions').insertOne({ id: 'rx-2', patient_id: 'patient-1', appointment_id: 'appt-1', createdAt: new Date(Date.now() + 60_000), items: [] } as any);
    const b = await svc.badge(me);
    expect(b.appointments).toEqual(expect.arrayContaining([{ appointment_id: 'appt-1', unseen: 1 }]));
    expect(b.unseen_total).toBe(2);
  });

  it("never counts another patient's outcomes", async () => {
    expect(await svc.badge(other)).toEqual({ unseen_total: 1, appointments: [{ appointment_id: 'appt-3', unseen: 1 }] });   // only rx-other
    expect(await svc.badge({ id: 'nobody' })).toEqual({ unseen_total: 0, appointments: [] });
  });
});

describe('helpers', () => {
  it('resolveCodes: id, short_code, code, then names (case-insensitive); duplicates once; empty ignored', () => {
    const rows = [{ id: 'a', short_code: 'CBC', name_en: 'Blood' }, { id: 'b', code: 'XR1', name_ar: 'أشعة' }];
    const out = resolveCodes(['a', 'cbc', ' CBC ', 'xr1', 'أشعة', 'zzz', ''], rows);
    expect(out.map((r) => `${r.code}:${r.resolved ? (r as any).id : 'no'}`)).toEqual(['a:a', 'cbc:a', 'xr1:b', 'أشعة:b', 'zzz:no']);
    expect(out[2]).toMatchObject({ short_code: 'XR1', name_ar: 'أشعة', name_en: null });
  });

  it('isNewOutcome', () => {
    expect(isNewOutcome(T1, null)).toBe(true);
    expect(isNewOutcome(T0, T1)).toBe(false);
    expect(isNewOutcome(T1, T0)).toBe(true);
    expect(isNewOutcome(undefined, T0)).toBe(false);
  });
});
