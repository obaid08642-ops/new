// Q95 (Round 11): any doctor, lab, radiology or hospital account could write a
// report into any patient's record, and doctor_id / doctor_name came from the
// body. A provider may write only for a patient it treats (an appointment, a
// lab or radiology booking, or an admission at its facility), any referenced
// booking id must be that relationship, and the author comes from the caller.
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ForbiddenException } from '@nestjs/common';
import { MedicalReportsService } from './medical-reports.service';

jest.setTimeout(60_000);

describe('MedicalReportsService.create requires a care relationship (Q95)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let service: MedicalReportsService;
  const created: Record<string, unknown>[] = [];
  const model = {
    create: jest.fn(async (doc: Record<string, unknown>) => { created.push(doc); return { ...doc, id: `r${created.length}`, toObject: () => ({ ...doc, id: `r${created.length}` }) }; }),
  };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'q95' }).asPromise();
    service = new MedicalReportsService(model as never, { emit: jest.fn() } as never, conn);
    const db = conn.db!;
    await db.collection('appointments').insertOne({ id: 'appt-1', patient_id: 'pat-P', doctor_id: 'docprof-1', doctor_user_id: 'doc-treating' });
    await db.collection('labbookings').insertOne({ id: 'lab-1', patient_id: 'pat-P', provider_account_id: 'lab-acc' });
    await db.collection('radiologybookings').insertOne({ id: 'rad-1', patient_id: 'pat-P', provider_account_id: 'rad-acc' });
    await db.collection('facility_admissions').insertOne({ id: 'adm-1', patient_id: 'pat-P', facility_id: 'hosp-acc', status: 'active' });
    await db.collection('provider_profiles').insertOne({ id: 'docprof-1', user_id: 'doc-treating', type: 'doctor', name_ar: 'د. مُعالج' });
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(() => { created.length = 0; model.create.mockClear(); });

  const report = (extra: Record<string, unknown> = {}) => ({ patient_id: 'pat-P', title_ar: 'تقرير', ...extra });

  it('an unrelated doctor is refused (403)', async () => {
    await expect(service.create({ id: 'doc-stranger', role: 'doctor' }, report())).rejects.toBeInstanceOf(ForbiddenException);
    expect(model.create).not.toHaveBeenCalled();
  });

  it('the treating doctor writes, and the author comes from the caller', async () => {
    await service.create({ id: 'doc-treating', role: 'doctor', full_name: 'Dr Real' }, report({ appointment_id: 'appt-1', doctor_id: 'forged', doctor_name: 'Forged Name' }));
    expect(created[0]).toEqual(expect.objectContaining({ patient_id: 'pat-P', doctor_id: 'docprof-1', doctor_name: 'د. مُعالج' }));
  });

  it('a referenced booking must belong to this patient and this provider', async () => {
    await expect(service.create({ id: 'doc-treating', role: 'doctor' }, report({ appointment_id: 'appt-of-someone-else' })))
      .rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.create({ id: 'lab-acc', role: 'lab' }, report({ lab_booking_id: 'rad-1' })))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lab, radiology and hospital write only for their own patients', async () => {
    await service.create({ id: 'lab-acc', role: 'lab' }, report({ lab_booking_id: 'lab-1' }));
    await service.create({ id: 'rad-acc', role: 'radiology' }, report({ radiology_booking_id: 'rad-1' }));
    await service.create({ id: 'hosp-acc', role: 'hospital' }, report());
    expect(created).toHaveLength(3);
    await expect(service.create({ id: 'lab-other', role: 'lab' }, report())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.create({ id: 'hosp-other', role: 'hospital' }, report())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('an admin may write for any patient', async () => {
    await service.create({ id: 'adm', role: 'admin' }, report());
    expect(created).toHaveLength(1);
  });
});
