import { AppointmentsService } from './appointments.service';

// A patient on the doctor's block list (provider-ops blacklist) cannot book that doctor.
function svcWith(rows: any[], broken = false) {
  const svc: any = Object.create(AppointmentsService.prototype);
  svc.connection = { collection: () => ({ findOne: async (f: any) => {
    if (broken) throw new Error('db down');
    return rows.find((r) => f.doctor_id.$in.includes(r.doctor_id) && r.patient_id === f.patient_id.$eq && r.active === f.active) ?? null;
  } }) };
  return svc;
}

describe('isBlockedByDoctor', () => {
  const rows = [{ doctor_id: 'dr-user', patient_id: 'p1', active: true }, { doctor_id: 'dr-user', patient_id: 'p2', active: false }];
  it('is true for an active block under any of the doctor\'s account ids', async () => {
    expect(await svcWith(rows).isBlockedByDoctor(['dr-user', undefined], 'p1')).toBe(true);
    expect(await svcWith(rows).isBlockedByDoctor([undefined, 'dr-user'], 'p1')).toBe(true);
  });
  it('is false for a lifted block, another patient, another doctor, and no ids', async () => {
    expect(await svcWith(rows).isBlockedByDoctor(['dr-user'], 'p2')).toBe(false);
    expect(await svcWith(rows).isBlockedByDoctor(['dr-user'], 'p3')).toBe(false);
    expect(await svcWith(rows).isBlockedByDoctor(['other'], 'p1')).toBe(false);
    expect(await svcWith(rows).isBlockedByDoctor([], 'p1')).toBe(false);
  });
  it('a read problem never stops a booking', async () => {
    expect(await svcWith(rows, true).isBlockedByDoctor(['dr-user'], 'p1')).toBe(false);
  });
});
