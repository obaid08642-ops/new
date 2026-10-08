import { ReferralService } from './referral.service';

function memCollection(seed: Array<Record<string, unknown>> = []) {
  const docs: Array<Record<string, unknown>> = [...seed];
  const match = (doc: Record<string, unknown>, filter: Record<string, unknown>): boolean =>
    Object.entries(filter || {}).every(([k, cond]) => {
      const v = doc[k];
      if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
        const c = cond as Record<string, unknown>;
        if ('$eq' in c) return v === c['$eq'];
        if ('$ne' in c) return v !== c['$ne'];
        if ('$exists' in c) return c['$exists'] ? k in doc : !(k in doc);
        return false;
      }
      return v === cond;
    });
  return {
    docs,
    findOne: jest.fn().mockImplementation(async (filter: Record<string, unknown>) => {
      const hit = docs.find((d) => match(d, filter));
      return hit ? { ...hit } : null;
    }),
    insertOne: jest.fn().mockImplementation(async (doc: Record<string, unknown>) => {
      docs.push({ ...doc });
      return { acknowledged: true };
    }),
    updateOne: jest.fn().mockImplementation(async (filter: Record<string, unknown>, upd: { $set?: Record<string, unknown> }) => {
      const hit = docs.find((d) => match(d, filter));
      if (!hit) return { matchedCount: 0 };
      Object.assign(hit, upd.$set || {});
      return { matchedCount: 1 };
    }),
  };
}

describe('ReferralService.apply — P22.15 one device/phone anti-fraud', () => {
  function setup() {
    const users = memCollection([
      { id: 'referrer-1', referral_code: 'NABD-AAA', full_name: 'Ref' },
      { id: 'new-1', createdAt: new Date() },
      { id: 'new-2', createdAt: new Date() },
      { id: 'new-3', createdAt: new Date() },
    ]);
    const invites = memCollection([]);
    const appointments = { countDocuments: jest.fn().mockResolvedValue(0) };
    const collections: Record<string, unknown> = { users, referral_invites: invites, appointments };
    const connection = { db: { collection: jest.fn((n: string) => collections[n]) } };
    const events = { emit: jest.fn() };
    const service = new ReferralService(connection as never, events as never);
    return { service, users, invites };
  }

  it('stores device + phone hash (never the raw phone)', async () => {
    const { service, invites } = setup();
    await service.apply('new-1', 'nabd-aaa', { device_id: 'dev-1', phone: '+966500000009' });
    expect(invites.docs).toHaveLength(1);
    expect(invites.docs[0]['device_id']).toBe('dev-1');
    expect(invites.docs[0]['phone_hash']).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(invites.docs[0])).not.toMatch('966500000009');
  });

  it('rejects a second user on the same device or phone', async () => {
    const { service } = setup();
    await service.apply('new-1', 'NABD-AAA', { device_id: 'dev-shared', phone: '+966511111111' });
    await expect(service.apply('new-2', 'NABD-AAA', { device_id: 'dev-shared' })).rejects.toMatchObject({
      response: { message: 'referral_device_reuse' },
    });
    await expect(service.apply('new-3', 'NABD-AAA', { phone: '966511111111' })).rejects.toMatchObject({
      response: { message: 'referral_phone_reuse' },
    });
  });

  it('keeps the pre-existing guards (self-referral still blocked)', async () => {
    const { service } = setup();
    await expect(
      service.apply('referrer-1', 'NABD-AAA', { device_id: 'd-x' }),
    ).rejects.toMatchObject({
      response: { message: expect.stringContaining('own referral') },
    });
  });
});
