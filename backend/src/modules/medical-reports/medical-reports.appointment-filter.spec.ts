/** GET /medical-reports/mine?appointment_id= and the link check of a new report: the reports of one visit, only for that visit's patient. */
import { BadRequestException } from '@nestjs/common';
import { MedicalReportsService } from './medical-reports.service';

function build(apptRow: unknown) {
  const seen: any = { filter: null, created: null, apptFilter: null };
  const model: any = {
    find: (filter: any) => { seen.filter = filter; return { sort: () => ({ limit: async () => [] }) }; },
    create: async (p: any) => { seen.created = p; return { id: 'r1', critical: false, tracking_id: 'T', toObject: () => p }; },
  };
  const connection: any = { collection: () => ({ findOne: async (f: any) => { seen.apptFilter = f; return apptRow; } }) };
  const svc = new MedicalReportsService(model, { emit: () => undefined } as any, connection, { record: async () => undefined, recordMany: async () => undefined } as any);
  return { svc, seen };
}

describe('medical reports of one visit', () => {
  it('list filters by a plain appointment_id string, never by an operator object', async () => {
    const { svc, seen } = build(null);
    await svc.list({ id: 'p1' }, { appointment_id: 'appt-1' });
    expect(seen.filter).toMatchObject({ patient_id: 'p1', appointment_id: 'appt-1' });
    await svc.list({ id: 'p1' }, { appointment_id: { $ne: 'x' } as any });
    expect(seen.filter).toEqual({ patient_id: 'p1' });
  });

  it('a new report linked to a visit is stored only when the visit is the report patient\'s', async () => {
    const ok = build({ _id: 1 });
    await ok.svc.create({ id: 'doc', role: 'doctor' }, { patient_id: 'p1', title_ar: 't', appointment_id: 'appt-1' });
    expect(ok.seen.apptFilter).toEqual({ id: { $eq: 'appt-1' }, patient_id: { $eq: 'p1' } });
    expect(ok.seen.created.appointment_id).toBe('appt-1');
    const bad = build(null);
    await expect(bad.svc.create({ id: 'doc', role: 'doctor' }, { patient_id: 'p1', title_ar: 't', appointment_id: 'appt-of-someone-else' })).rejects.toBeInstanceOf(BadRequestException);
    expect(bad.seen.created).toBeNull();
    await expect(bad.svc.create({ id: 'doc', role: 'doctor' }, { patient_id: 'p1', title_ar: 't', appointment_id: { $ne: '' } })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('a report without a visit is unchanged', async () => {
    const { svc, seen } = build(null);
    await svc.create({ id: 'doc', role: 'doctor' }, { patient_id: 'p1', title_ar: 't' });
    expect(seen.apptFilter).toBeNull();
    expect(seen.created.appointment_id).toBeUndefined();
  });
});
