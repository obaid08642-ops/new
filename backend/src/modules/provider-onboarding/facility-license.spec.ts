import { facilityLicenseProblems, lapsedAccountUpdate, suspendAccountForLicense } from './facility-license';

const now = new Date('2026-10-30T12:00:00Z');
const future = '2027-03-01T00:00:00Z';
const past = '2026-09-01T00:00:00Z';

describe('facility licence expiry at submission', () => {
  it('only the licensed facility types are checked (not doctors, not delivery)', () => {
    expect(facilityLicenseProblems({ type: 'doctor' }, now, true)).toEqual([]);
    expect(facilityLicenseProblems({ type: 'delivery' }, now, true)).toEqual([]);
  });
  it('a past or not-a-date expiry is refused for pharmacy, hospital, lab, radiology, nursing and home care, whatever the switch', () => {
    for (const type of ['pharmacy', 'hospital', 'lab', 'radiology', 'nursing', 'home_care']) {
      expect(facilityLicenseProblems({ type, license_expiry_date: past }, now, false)).toEqual(['license_already_expired']);
      expect(facilityLicenseProblems({ type, license_expiry_date: future }, now, true)).toEqual([]);
    }
    expect(facilityLicenseProblems({ type: 'lab', license_expiry_date: now }, now, false)).toEqual(['license_already_expired']);
  });
  it('a missing expiry is refused only when the requirement is switched on (the apps send it from their release)', () => {
    expect(facilityLicenseProblems({ type: 'lab' }, now, false)).toEqual([]);
    expect(facilityLicenseProblems({ type: 'lab' }, now, true)).toEqual(['license_expiry_date_required']);
    expect(facilityLicenseProblems({ type: 'lab', license_expiry_date: 'not a date' }, now, true)).toEqual(['license_expiry_date_required']);
  });
});

describe('a lapsed licence suspends the account, not only the profile', () => {
  const fakeDb = (account: Record<string, unknown> | null) => {
    const updates: Array<{ q: unknown; u: any }> = [];
    return { updates, conn: { collection: () => ({ findOne: async () => account, updateOne: async (q: unknown, u: any) => { updates.push({ q, u }); return { modifiedCount: 1 }; } }) } };
  };
  it('the update sets suspended, records why in the status history and bumps token_version so an open session ends', () => {
    const u: any = lapsedAccountUpdate('license_expired', 'approved', now);
    expect(u.$set.status).toBe('suspended');
    expect(u.$push.status_history).toMatchObject({ from: 'approved', to: 'suspended', by_role: 'system', note: 'license_expired' });
    expect(u.$inc).toEqual({ token_version: 1 });
  });
  it('an approved account is suspended (guarded on still being approved)', async () => {
    const { conn, updates } = fakeDb({ id: 'acc-1', status: 'approved' });
    await expect(suspendAccountForLicense(conn, { account_id: 'acc-1' }, 'license_expired')).resolves.toBe(true);
    expect(updates[0].q).toEqual({ id: 'acc-1', status: 'approved' });
  });
  it('an account that is not approved, or no account, is left alone', async () => {
    for (const status of ['suspended', 'rejected', 'pending_admin_approval']) {
      const { conn, updates } = fakeDb({ id: 'acc-1', status });
      await expect(suspendAccountForLicense(conn, { account_id: 'acc-1' }, 'license_expired')).resolves.toBe(false);
      expect(updates).toEqual([]);
    }
    await expect(suspendAccountForLicense(fakeDb(null).conn, { account_id: 'x' }, 'r')).resolves.toBe(false);
    await expect(suspendAccountForLicense(fakeDb(null).conn, {}, 'r')).resolves.toBe(false);
  });
});
