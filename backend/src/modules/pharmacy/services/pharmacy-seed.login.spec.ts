import { PharmacySeedService } from './pharmacy-seed.service';

// Needs-review issue 505: the seeded test pharmacies can sign in (provider login checks the linked users row).
describe('PharmacySeedService test pharmacies', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('creates a linked users row with a password for each seeded pharmacy account', async () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_TEST_SEED = 'true';
    const inserted: any[] = [];
    const users = { findOne: jest.fn().mockResolvedValue(null), insertOne: jest.fn(async (d: any) => { inserted.push(d); }) };
    let n = 0;
    const accounts: any = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(async (d: any) => ({ ...d, id: d.id || `acc-${++n}` })),
      db: { collection: (name: string) => (name === 'users' ? users : null) },
    };
    const profiles: any = { findOne: jest.fn().mockResolvedValue({ id: 'p', save: jest.fn().mockResolvedValue({}) }), create: jest.fn() };
    const avails: any = { findOneAndUpdate: jest.fn().mockResolvedValue({}) };
    const inv: any = { findOneAndUpdate: jest.fn().mockResolvedValue({}) };
    const service = new PharmacySeedService({} as any, inv, accounts, profiles, avails);
    await service.seed({ id: 'admin-1', role: 'admin' });
    expect(inserted.length).toBe(accounts.create.mock.calls.length);
    for (const u of inserted) {
      expect(u).toMatchObject({ role: 'pharmacy', active: true });
      expect(typeof u.password_hash).toBe('string');
      expect(u.password_hash.length).toBeGreaterThan(20);
    }
  });
});
