import { AppointmentsService } from './appointments.service';

const build = (rows: any[], users: any[], doctors: any[]) => {
  const chain = (r: any[]) => ({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve(r) }) }) });
  const apptModel: any = { find: jest.fn(() => chain(rows)) };
  const providerModel: any = { find: jest.fn(() => ({ lean: () => Promise.resolve(doctors) })) };
  const finds: any[] = [];
  const connection: any = { collection: () => ({ find: (q: any) => { finds.push(q); return { project: () => ({ toArray: () => Promise.resolve(users) }) }; } }) };
  return { svc: new (AppointmentsService as any)(apptModel, providerModel, connection, {}, {}, {}), finds, providerModel };
};

describe('admin appointments list', () => {
  it('adds the patient and doctor names with one lookup each for the whole page', async () => {
    const rows = [{ id: 'a1', patient_id: 'p1', doctor_id: 'd1' }, { id: 'a2', patient_id: 'p1', doctor_id: 'd2' }];
    const { svc, finds, providerModel } = build(rows, [{ id: 'p1', full_name: 'Sara' }], [{ id: 'd1', name_ar: 'د. أحمد' }]);
    const out = await svc.adminList(50);
    expect(out.map((r: any) => [r.patient_name, r.doctor_name])).toEqual([['Sara', 'د. أحمد'], ['Sara', null]]);
    expect(finds).toHaveLength(1);
    expect(providerModel.find).toHaveBeenCalledTimes(1);
  });
  it('an empty page makes no lookups', async () => {
    const { svc, finds, providerModel } = build([], [], []);
    expect(await svc.adminList(50)).toEqual([]);
    expect(finds).toHaveLength(0);
    expect(providerModel.find).not.toHaveBeenCalled();
  });
});
