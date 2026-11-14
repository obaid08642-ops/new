/** Approving a doctor-session capability puts its price on the profile field the booking reads (F.4). */
import { ProviderAdminService } from './provider-admin.service';

const build = (delta: any) => {
  const calls: Array<{ coll: string; op: string; args: any[] }> = [];
  const db = {
    collection: (coll: string) => new Proxy({}, {
      get: (_t, op: string) => async (...args: any[]) => {
        calls.push({ coll, op, args });
        if (coll === 'provider_deltas' && op === 'findOne') return delta;
        if (op === 'findOne') return null;
        return { modifiedCount: 1, upsertedCount: 0, deletedCount: 1 };
      },
    }),
  };
  const svc: any = Object.create(ProviderAdminService.prototype);
  svc.assertAdmin = jest.fn();
  svc.accounts = { model: { db, updateOne: jest.fn() } };
  svc.audit = { create: jest.fn() };
  svc.seoPipeline = { processEntity: jest.fn(async () => undefined) };
  svc.events = { emit: jest.fn() };
  return { svc, calls };
};
const delta = (payload: any, operation = 'update') => ({
  id: 'd1', status: 'pending', target: 'capability', account_id: 'doc-1',
  requested_changes: { catalog: 'doctor_sessions', operation, filter: { provider_account_id: 'doc-1', consultation_type: payload?.consultation_type, specialty: 'cardio' }, payload },
});

describe('approveDelta: doctor session prices', () => {
  it('writes the approved video price to the profile price_online', async () => {
    const { svc, calls } = build(delta({ consultation_type: 'video', specialty: 'cardio', price: 180, provider_account_id: 'doc-1' }));
    await svc.approveDelta({ id: 'admin-1', role: 'admin' }, 'd1');
    const profileWrite = calls.find((c) => c.coll === 'provider_profiles' && c.op === 'updateOne');
    expect(profileWrite?.args[1].$set).toMatchObject({ price_online: 180 });
  });

  it('does not touch the profile for a delete, a voice session or an unavailable one', async () => {
    for (const d of [delta(null, 'delete'), delta({ consultation_type: 'voice', price: 90 }), delta({ consultation_type: 'clinic', price: 90, available: false })]) {
      const { svc, calls } = build(d);
      await svc.approveDelta({ id: 'admin-1', role: 'admin' }, 'd1');
      expect(calls.find((c) => c.coll === 'provider_profiles' && c.op === 'updateOne')).toBeUndefined();
    }
  });
});
