import { LegalEnterpriseService } from './legal-enterprise.service';

/** Owner decision 2026-10-24: a warning 30 days before the SCFHS licence expires; bookings stop once it has. */
describe('licence monitor', () => {
  const DAY = 24 * 3600 * 1000;
  const run = async (profile: any, account: any = { id: 'acc-1', status: 'approved' }) => {
    const updates: any[] = [];
    const notes: any[] = [];
    const profiles = { find: () => ({ toArray: async () => [profile] }), updateOne: async (_q: any, u: any) => { updates.push(u.$set); } };
    const notifications = { insertOne: async (d: any) => { notes.push(d); } };
    const accountUpdates: any[] = [];
    const accounts = { findOne: async () => account, updateOne: async (q: any, u: any) => { accountUpdates.push({ q, u }); return { modifiedCount: 1 }; } };
    const svc: any = Object.create(LegalEnterpriseService.prototype);
    svc.conn = { collection: (n: string) => (n === 'provider_profiles' ? profiles : n === 'provider_accounts' ? accounts : notifications) };
    svc.logger = { warn: jest.fn(), error: jest.fn() };
    await svc.licenseMonitor();
    return { updates, notes, accountUpdates };
  };
  const inDays = (d: number) => new Date(Date.now() + d * DAY - 1000);

  it('warns once when 30 days or fewer are left, and not twice for the same expiry', async () => {
    const exp = inDays(29);
    const first = await run({ _id: 1, id: 'p1', user_id: 'u1', license_expiry_date: exp });
    expect(first.notes).toHaveLength(1);
    expect(first.updates[0]).toMatchObject({ license_warn_30d: true, license_warn_expiry: exp.toISOString() });
    const second = await run({ _id: 1, id: 'p1', user_id: 'u1', license_expiry_date: exp, license_warn_30d: true, license_warn_expiry: exp.toISOString() });
    expect(second.notes).toHaveLength(0);
  });

  it('a renewed licence (new expiry date) is warned about again', async () => {
    const renewed = inDays(25);
    const r = await run({ _id: 1, id: 'p1', user_id: 'u1', license_expiry_date: renewed, license_warn_30d: true, license_warn_expiry: new Date(Date.now() - 300 * DAY).toISOString() });
    expect(r.notes).toHaveLength(1);
    expect(r.updates[0]).toMatchObject({ license_warn_30d: true, license_warn_14d: false, license_warn_expiry: renewed.toISOString() });
  });

  it('more than 30 days left: nothing; expired: the account is suspended and hidden', async () => {
    expect((await run({ _id: 1, id: 'p1', user_id: 'u1', license_expiry_date: inDays(45) })).notes).toHaveLength(0);
    const gone = await run({ _id: 1, id: 'p1', user_id: 'u1', license_expiry_date: new Date(Date.now() - DAY) });
    expect(gone.updates[0]).toMatchObject({ status: 'suspended', suspended_reason: 'license_expired', public_eligibility: false, license_status: 'expired' });
    expect(gone.notes).toHaveLength(1);
  });

  it('expired: the provider ACCOUNT is suspended too (login refused, open session ended), for any provider type', async () => {
    for (const type of ['pharmacy', 'lab', 'radiology', 'nursing', 'hospital']) {
      const gone = await run({ _id: 1, id: 'p1', type, account_id: 'acc-1', user_id: 'u1', license_expiry_date: new Date(Date.now() - DAY) });
      expect(gone.accountUpdates).toHaveLength(1);
      expect(gone.accountUpdates[0].u.$set.status).toBe('suspended');
      expect(gone.accountUpdates[0].u.$inc).toEqual({ token_version: 1 });
    }
    const already = await run({ _id: 1, id: 'p1', account_id: 'acc-1', license_expiry_date: new Date(Date.now() - DAY) }, { id: 'acc-1', status: 'suspended' });
    expect(already.accountUpdates).toEqual([]);
  });
});
