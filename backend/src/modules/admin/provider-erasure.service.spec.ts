import { PROVIDER_OWNED_COLLECTIONS, PROVIDER_PURGE_TAGS, ProviderErasureService } from './provider-erasure.service';
import { SearchService } from '../search/search.service';

/** Issue 1541: a provider delete removes every row the provider owns, its files, search documents and page caches. */

type Row = Record<string, unknown>;
type Filter = { $or?: Filter[]; [field: string]: unknown };

/** A tiny in-memory Mongo: find / deleteMany with the $or/$in filters the service sends. */
function fakeDb(data: Record<string, Row[]>) {
  const match = (row: Row, filter: Filter): boolean => {
    if (filter.$or) return filter.$or.some((f) => match(row, f));
    return Object.entries(filter).every(([k, v]) => (v && typeof v === 'object' && '$in' in v ? (v as { $in: unknown[] }).$in.includes(row[k]) : row[k] === v));
  };
  const collection = jest.fn((name: string) => {
    data[name] = data[name] || [];
    return {
      find: (filter: Filter) => ({ toArray: async () => data[name].filter((r) => match(r, filter)) }),
      deleteMany: async (filter: Filter) => {
        const before = data[name].length;
        data[name] = data[name].filter((r) => !match(r, filter));
        return { deletedCount: before - data[name].length };
      },
    };
  });
  return { collection };
}

describe('ProviderErasureService (issue 1541)', () => {
  const USER = 'user-1';
  const ACCOUNT = 'acct-1';
  const PROFILE = 'prof-1';

  const seed = (): Record<string, Row[]> => ({
    provider_profiles: [
      { _id: 'oid-1', id: PROFILE, user_id: USER, account_id: ACCOUNT, type: 'doctor', slug: 'dr-test', profile_photo: 'file-photo', clinic_images: ['file-clinic', 'https://cdn.example/clinic.png'] },
      { _id: 'oid-2', account_id: ACCOUNT, display_name_ar: 'ملف المزود' },
      { _id: 'oid-3', id: 'prof-other', user_id: 'user-other', type: 'doctor' },
    ],
    provider_accounts: [{ id: ACCOUNT, user_id: USER }, { id: 'acct-other', user_id: 'user-other' }],
    provider_capabilities_pharmacy: [{ provider_account_id: ACCOUNT }, { provider_account_id: 'acct-other' }],
    provider_capabilities_lab: [{ provider_account_id: ACCOUNT }],
    provider_capabilities_radiology: [{ provider_account_id: USER }],
    provider_capabilities_doctor_sessions: [{ provider_account_id: ACCOUNT }],
    provider_capabilities_home_care: [{ provider_account_id: ACCOUNT }],
    provider_delivery_zones: [{ provider_account_id: ACCOUNT }],
    provider_schedule_slots: [{ provider_account_id: ACCOUNT }, { provider_account_id: 'acct-other' }],
    provider_availability: [{ provider_account_id: ACCOUNT }],
    provider_deltas: [{ provider_id: ACCOUNT, status: 'pending' }, { provider_id: 'acct-other', status: 'pending' }],
    pharmacy_inventory: [{ pharmacy_id: USER }],
    storage_objects: [
      { id: 'file-photo', owner_account_id: USER, external_url: 'http://s3.local/bucket/photo.png' },
      { id: 'file-clinic', owner_account_id: 'admin-1', external_url: 'http://s3.local/bucket/clinic.png' },
      { id: 'file-other', owner_account_id: 'user-other', external_url: 'http://s3.local/bucket/other.png' },
    ],
    public_catalog_projections: [{ entity_id: PROFILE }, { entity_id: 'prof-other' }],
    // Shared records: never touched.
    appointments: [{ doctor_id: PROFILE }],
    orders: [{ pharmacy_id: USER }],
    platformledgerentries: [{ provider_id: ACCOUNT }],
  });

  const make = (data: Record<string, Row[]>) => {
    const events = { emitAsync: jest.fn().mockResolvedValue([]) };
    const search = { applyChange: jest.fn().mockResolvedValue(undefined) };
    const seo = { invalidateCaches: jest.fn().mockResolvedValue(undefined) };
    const purgeBus = { purge: jest.fn().mockResolvedValue(undefined) };
    const svc = new ProviderErasureService({ collection: fakeDb(data).collection } as never, events as never, search as never, seo as never, purgeBus as never);
    return { svc, events, search, seo, purgeBus };
  };

  it('finds the provider under its user, account and profile ids, from the user id alone', async () => {
    const data = seed();
    const { svc } = make(data);
    const who = await svc.identify({ userId: USER });
    expect(new Set(who.ids)).toEqual(new Set([USER, ACCOUNT, PROFILE]));
    expect(who.profiles.map((p) => p._id).sort()).toEqual(['oid-1', 'oid-2']);
  });

  it('deletes every owned row of the provider and nothing of another provider or the shared records', async () => {
    const data = seed();
    const { svc } = make(data);
    await svc.erase(await svc.identify({ userId: USER }));
    for (const c of PROVIDER_OWNED_COLLECTIONS) {
      const left = (data[c.name] || []).filter((r) => [USER, ACCOUNT, PROFILE].some((id) => c.fields.some((f) => r[f] === id)));
      expect({ collection: c.name, left }).toEqual({ collection: c.name, left: [] });
    }
    expect(data.provider_profiles.map((p) => p._id)).toEqual(['oid-3']);
    expect(data.provider_capabilities_pharmacy).toEqual([{ provider_account_id: 'acct-other' }]);
    expect(data.provider_deltas).toEqual([{ provider_id: 'acct-other', status: 'pending' }]);
    // the clinic photo uploaded by an admin is still the profile's own file
    expect(data.storage_objects.map((o) => o.id)).toEqual(['file-other']);
    expect(data.public_catalog_projections).toEqual([{ entity_id: 'prof-other' }]);
    expect(data.appointments).toHaveLength(1);
    expect(data.orders).toHaveLength(1);
    expect(data.platformledgerentries).toHaveLength(1);
  });

  it('sends every file of the provider to the storage deleter before the rows go', async () => {
    const data = seed();
    const { svc, events } = make(data);
    await svc.erase(await svc.identify({ userId: USER }));
    const urls = events.emitAsync.mock.calls.map(([name, p]: [string, { url: string }]) => `${name} ${p.url}`).sort();
    expect(urls).toEqual([
      'storage.delete_by_url http://s3.local/bucket/clinic.png',
      'storage.delete_by_url http://s3.local/bucket/photo.png',
      'storage.delete_by_url https://cdn.example/clinic.png',
    ]);
  });

  it('removes the search documents, the page caches and the sitemap entry', async () => {
    const data = seed();
    const { svc, search, seo, purgeBus } = make(data);
    await svc.erase(await svc.identify({ userId: USER }));
    expect(search.applyChange.mock.calls.map((c) => [c[0], c[1], c[2]]).sort()).toEqual([
      ['provider_profiles', 'oid-1', null],
      ['provider_profiles', 'oid-2', null],
    ]);
    expect(seo.invalidateCaches).toHaveBeenCalledWith('doctor', PROFILE, 'dr-test');
    expect(purgeBus.purge).toHaveBeenCalledWith(PROVIDER_PURGE_TAGS);
  });

  it('erases a profile that has no account from the profile row alone', async () => {
    const data = seed();
    data.provider_accounts = [];
    const orphan = { _id: 'oid-9', id: 'prof-9', user_id: 'gone-user', type: 'doctor', profile_photo: 'file-9' };
    data.provider_profiles.push(orphan);
    data.provider_schedule_slots.push({ provider_account_id: 'gone-user' });
    data.storage_objects.push({ id: 'file-9', owner_account_id: 'gone-user', external_url: 'http://s3.local/bucket/9.png' });
    const { svc, search } = make(data);
    const deleted = await svc.erase(await svc.identify({ profile: orphan }));
    expect(deleted.provider_profiles).toBe(1);
    expect(deleted.provider_schedule_slots).toBe(1);
    expect(deleted.storage_objects).toBe(1);
    expect(search.applyChange).toHaveBeenCalledWith('provider_profiles', 'oid-9', null);
  });

  it('keeps the deletion when an edge purge layer has no credentials', async () => {
    const data = seed();
    const { svc, purgeBus } = make(data);
    purgeBus.purge.mockRejectedValueOnce(new Error('purge_cloudflare_missing_credentials'));
    const deleted = await svc.erase(await svc.identify({ userId: USER }));
    expect(deleted.provider_profiles).toBe(2);
  });
});

describe('SearchService.applyChange with no record (issue 1541)', () => {
  it('removes the documents of a deleted profile from the index and from Meilisearch', async () => {
    const index = {
      find: jest.fn(() => ({ toArray: async () => [{ key: 'doctor-abc' }] })),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    const svc = new SearchService({ collection: jest.fn(() => index) } as never);
    const meili = { ensureIndex: jest.fn().mockResolvedValue(undefined), remove: jest.fn().mockResolvedValue(undefined), upsert: jest.fn() };
    (svc as unknown as { meili: typeof meili }).meili = meili;
    await svc.applyChange('provider_profiles', 'oid-1', null);
    expect(index.find).toHaveBeenCalledWith({ src: 'provider_profiles:oid-1' }, { projection: { key: 1 } });
    expect(index.deleteMany).toHaveBeenCalledWith({ key: { $in: ['doctor-abc'] } });
    expect(meili.remove).toHaveBeenCalledWith(['doctor-abc']);
    expect(meili.upsert).not.toHaveBeenCalled();
  });
});

describe('AdminController provider delete routes (issue 1541)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AdminController } = require('./admin.controller');
  const make = (profiles: Row[], users: Row[]) => {
    const cols: Record<string, unknown> = {
      provider_profiles: { findOne: jest.fn(async (f: { id: string }) => profiles.find((p) => p.id === f.id) || null), find: jest.fn(() => ({ sort: () => ({ limit: () => ({ toArray: async () => profiles }) }) })) },
      users: { findOne: jest.fn(async (f: { id: string }) => users.find((u) => u.id === f.id) || null), find: jest.fn((f: { id: { $in: string[] } }) => ({ toArray: async () => users.filter((u) => f.id.$in.includes(String(u.id))) })) },
    };
    const userModel = { db: { collection: (n: string) => cols[n] } };
    const erasure = { identify: jest.fn(async (seed: { profile: Row }) => ({ ids: [seed.profile.id], profiles: [seed.profile] })), erase: jest.fn(async () => ({ provider_profiles: 1 })) };
    const events = { emit: jest.fn() };
    const ctl = new AdminController(userModel as never, {} as never, {} as never, {} as never, events as never, erasure as never);
    return { ctl, erasure, events };
  };

  it('lists only the profiles whose sign-in account is gone', async () => {
    const { ctl } = make([{ id: 'p1', user_id: 'gone', type: 'doctor', name_ar: 'د. اختبار' }, { id: 'p2', user_id: 'live' }, { id: 'p3' }], [{ id: 'live' }]);
    const out = await ctl.listOrphanProviderProfiles();
    expect(out.items.map((i: { id: string }) => i.id)).toEqual(['p1', 'p3']);
  });

  it('deletes a profile with no account through the erasure, and audits it', async () => {
    const { ctl, erasure, events } = make([{ id: 'p1', user_id: 'gone' }], []);
    const out = await ctl.deleteOrphanProviderProfile('p1', { id: 'admin-1' });
    expect(out.ok).toBe(true);
    expect(erasure.erase).toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith('admin.user_updated', { admin_id: 'admin-1', target_user_id: 'p1', action: 'provider_profile_delete' });
  });

  it('refuses a profile that still has an account (the user delete removes both)', async () => {
    const { ctl, erasure } = make([{ id: 'p2', user_id: 'live' }], [{ id: 'live' }]);
    await expect(ctl.deleteOrphanProviderProfile('p2', { id: 'admin-1' })).rejects.toThrow('provider_profile_has_account');
    expect(erasure.erase).not.toHaveBeenCalled();
  });

  it('the user delete and the profile delete carry the same guards', () => {
    const reflect = (name: string, key: string) => Reflect.getMetadata(key, AdminController.prototype[name]);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { STEP_UP_KEY } = require('../../common/step-up.guard');
    const permKey = Reflect.getMetadataKeys(AdminController.prototype.deleteUser).find((k: string) => /perm/i.test(String(k)));
    expect(reflect('deleteOrphanProviderProfile', STEP_UP_KEY)).toBe(true);
    expect(reflect('deleteUser', STEP_UP_KEY)).toBe(true);
    expect(permKey).toBeDefined();
    expect(reflect('deleteOrphanProviderProfile', permKey)).toEqual(reflect('deleteUser', permKey));
  });
});
