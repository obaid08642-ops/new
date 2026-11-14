import { ProviderJobsService } from './provider-jobs.module';

const chain = (rows: any[]) => ({ sort: () => ({ limit: () => ({ lean: async () => rows }) }) });

function build(over: any = {}) {
  const svc: any = Object.create(ProviderJobsService.prototype);
  svc.kindAliases = { lab: 'lab', radiology: 'radiology', consultation: 'consultation', nursing: 'nursing', pharmacy: 'pharmacy' };
  svc.allowedKindsFor = async () => new Set(['lab', 'radiology', 'consultation']);
  const find = (name: string) => jest.fn((q: any) => { svc.__q[name] = q; return chain(over[name] || []); });
  svc.__q = {};
  svc.orders = { find: find('orders') };
  svc.labs = { find: find('labs'), findOne: jest.fn(async (q: any) => { svc.__q.labFindOne = q; return over.labOne ?? null; }) };
  svc.rads = { find: find('rads'), findOne: jest.fn(async (q: any) => { svc.__q.radFindOne = q; return over.radOne ?? null; }) };
  svc.home = { find: find('home') };
  svc.appts = { find: find('appts') };
  svc.users = { find: () => ({ lean: async () => [] }), db: { collection: () => ({ find: () => ({ toArray: async () => [] }) }) } };
  svc.attachments = { aggregate: async () => [] };
  return svc;
}
const LAB = { id: 'l1', patient_id: 'p1', state: 'NEW_REQUEST', createdAt: new Date() };

describe('provider job queue: a booking that names its provider at creation is incoming', () => {
  it('lab and radiology are read by provider_account_id (the field their schemas have), not account_id', async () => {
    const svc = build({ labs: [LAB] });
    await svc.queue({ id: 'prov-1', role: 'lab' }, 'incoming');
    expect(svc.__q.labs.provider_account_id).toBe('prov-1');
    expect(svc.__q.labs.account_id).toBeUndefined();
    expect(svc.__q.rads.provider_account_id).toBe('prov-1');
  });

  it('incoming includes the REQUESTED states for lab, radiology and consultation, which are never ASSIGNED', async () => {
    const svc = build({});
    await svc.queue({ id: 'prov-1', role: 'lab' }, 'incoming');
    expect(svc.__q.labs.state.$in).toEqual(expect.arrayContaining(['NEW_REQUEST']));
    expect(svc.__q.rads.state.$in).toEqual(expect.arrayContaining(['PENDING']));
    expect(svc.__q.appts.status.$in).toEqual(expect.arrayContaining(['PENDING']));
  });

  it('the active list is unchanged (no REQUESTED states leak in)', async () => {
    const svc = build({});
    await svc.queue({ id: 'prov-1', role: 'lab' }, 'active');
    expect(svc.__q.labs.state.$in).not.toContain('NEW_REQUEST');
    expect(svc.__q.labs.state.$in).toContain('CONFIRMED');
  });
});

describe('generic job step: lookup and repeat', () => {
  const user = { id: 'prov-1', role: 'lab' };

  it('finds a lab booking by provider_account_id', async () => {
    const entity = { id: 'l1', state: 'NEW_REQUEST', payment_method: 'cash', location_type: 'facility', patient_id: 'p1', toObject() { return { ...this }; }, save: jest.fn() };
    const svc = build({ labOne: entity });
    svc.engine = { apply: jest.fn(async () => ({ ok: true })) };
    await svc.accept(user, 'lab', 'l1');
    expect(svc.__q.labFindOne).toEqual({ id: 'l1', provider_account_id: 'prov-1' });
    expect(svc.engine.apply).toHaveBeenCalledTimes(1);
  });

  it('a repeated accept answers with the record and does not run the step again', async () => {
    const entity = { id: 'l1', state: 'CONFIRMED', payment_method: 'cash', location_type: 'facility', patient_id: 'p1', toObject() { return { id: 'l1', state: 'CONFIRMED' }; }, save: jest.fn() };
    const svc = build({ labOne: entity });
    svc.engine = { apply: jest.fn() };
    expect(await svc.accept(user, 'lab', 'l1')).toEqual({ id: 'l1', state: 'CONFIRMED' });
    expect(svc.engine.apply).not.toHaveBeenCalled();
    expect(entity.save).not.toHaveBeenCalled();
  });

  it('a repeated reject of a cancelled booking is also a no-op', async () => {
    const entity = { id: 'l1', state: 'CANCELLED', patient_id: 'p1', toObject() { return { id: 'l1', state: 'CANCELLED' }; } };
    const svc = build({ labOne: entity });
    svc.engine = { apply: jest.fn() };
    expect(await svc.reject(user, 'lab', 'l1', 'x')).toEqual({ id: 'l1', state: 'CANCELLED' });
    expect(svc.engine.apply).not.toHaveBeenCalled();
  });

  it('the history entry carries `state` (the appointment history schema requires it) when a step does run', async () => {
    const entity: any = { id: 'a1', status: 'PENDING', patient_id: 'p1', doctor_user_id: 'prov-1', state_history: [], toObject() { return { ...this }; }, save: jest.fn(async () => undefined) };
    const svc = build({});
    svc.appts.findOne = jest.fn(async () => entity);
    svc.allowedKindsFor = async () => new Set(['consultation']);
    svc.engine = { apply: jest.fn(async (a: any) => a.mutate()) };
    await svc.accept({ id: 'prov-1', role: 'doctor' }, 'consultation', 'a1');
    expect(entity.state_history[0]).toMatchObject({ state: 'CONFIRMED', from: 'PENDING', to: 'CONFIRMED' });
  });
});
