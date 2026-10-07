/**
 * 15.9 — GET /provider/profile/availability exposes the Ramadan /
 * special-hours source the slot engine honours.
 *
 * Before this change the endpoint returned only
 * `provider_accounts.availability`, so the provider app could never show the
 * `ramadan_hours` / `special_hours` stored on the provider profile. The
 * response now merges both lists (missing/malformed → []). Reverting the
 * merge makes every test below fail: the fields come back undefined.
 */
import { ProviderProductionService } from './provider-production.module';

const RAMADAN = [{ day: 'all', open: '10:30', close: '14:30' }];
const SPECIAL = [{ date: '2027-06-10', closed: true, reason: 'Eid al-Adha' }];

function serviceWith(account: any, profile: any) {
  const accounts = { findOne: jest.fn(async () => account) };
  const profiles = { findOne: jest.fn(async () => profile) };
  const connection: any = {
    collection: jest.fn((name: string) => (name === 'provider_profiles' ? profiles : accounts)),
  };
  const svc = new ProviderProductionService(connection);
  return { svc, accounts, profiles };
}

describe('15.9 availability exposes Ramadan / special hours', () => {
  const user = { id: 'provider-1', role: 'pharmacy' };

  it('merges ramadan_hours and special_hours from the provider profile', async () => {
    const { svc, profiles } = serviceWith(
      { id: 'provider-1', availability: { vacation_mode: false, weekly_schedule: [] } },
      { ramadan_hours: RAMADAN, special_hours: SPECIAL },
    );
    const out: any = await svc.getAvailability(user);
    expect(out.vacation_mode).toBe(false);
    expect(out.weekly_schedule).toEqual([]);
    expect(out.ramadan_hours).toEqual(RAMADAN);
    expect(out.special_hours).toEqual(SPECIAL);
    expect(profiles.findOne).toHaveBeenCalledWith(
      { $or: [{ user_id: 'provider-1' }, { account_id: 'provider-1' }] },
      { projection: { _id: 0, ramadan_hours: 1, special_hours: 1 } },
    );
  });

  it('defaults both lists to [] when the profile has none', async () => {
    const { svc } = serviceWith({ id: 'provider-1', availability: null }, null);
    const out: any = await svc.getAvailability(user);
    expect(out.ramadan_hours).toEqual([]);
    expect(out.special_hours).toEqual([]);
  });

  it('defaults both lists to [] when the stored values are malformed', async () => {
    const { svc } = serviceWith(
      { id: 'provider-1', availability: { vacation_mode: true } },
      { ramadan_hours: 'all-day', special_hours: { date: '2027-06-10' } },
    );
    const out: any = await svc.getAvailability(user);
    expect(out.vacation_mode).toBe(true);
    expect(out.ramadan_hours).toEqual([]);
    expect(out.special_hours).toEqual([]);
  });
});
