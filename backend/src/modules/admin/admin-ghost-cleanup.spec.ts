import { AdminController } from './admin.controller';

const makeController = (collections: Record<string, any[]>) => {
  const cols: any = {};
  for (const [name, rows] of Object.entries(collections)) {
    cols[name] = {
      rows,
      find: jest.fn().mockImplementation((_f: any, _p: any) => ({ toArray: async () => rows })),
      findOne: jest.fn().mockImplementation((f: any) => Promise.resolve(rows.find((r: any) => Object.entries(f || {}).every(([k, v]) => (r as any)[k] === v)) || null)),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
      updateMany: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    };
  }
  const db = { collection: jest.fn((n: string) => cols[n] || cols.users) };
  const userModel: any = {
    findOne: jest.fn().mockImplementation(() => ({ exec: async () => null })),
    findById: jest.fn().mockImplementation(() => Promise.resolve(null)),
    deleteOne: jest.fn(),
    db,
  };
  const ctl = new AdminController(userModel, {} as any, {} as any, {} as any, {} as any, undefined);
  return { ctl, cols, userModel };
};

describe('AdminController user/profile sync', () => {
  it('banUser suspends linked provider profiles (ghost fix)', async () => {
    const user = { id: 'u1', role: 'doctor', active: true, suspended: false, save: jest.fn() };
    const { ctl, cols, userModel } = makeController({ provider_profiles: [{ user_id: 'u1', status: 'ACTIVE', public_eligibility: true }] });
    userModel.findOne.mockImplementation(() => ({ exec: async () => user }));
    const out: any = await ctl.banUser('u1', { id: 'admin' });
    expect(out.message).toBe('user_banned');
    expect(cols.provider_profiles.updateMany).toHaveBeenCalledWith(
      { user_id: 'u1' }, { $set: { status: 'SUSPENDED', public_eligibility: false } },
    );
  });

  it('cleanup-orphans dry-run reports ghosts without writing', async () => {
    const { ctl, cols } = makeController({
      provider_profiles: [
        { user_id: 'gone1', status: 'ACTIVE', public_eligibility: true },
        { user_id: 'ok1', status: 'ACTIVE', public_eligibility: true },
      ],
      users: [{ id: 'ok1', active: true, suspended: false }],
    });
    const out: any = await ctl.cleanupOrphans({ dry_run: true });
    expect(out.dry_run).toBe(true);
    expect(out.ghost_fixed).toBe(1);
    expect(cols.provider_profiles.updateOne).not.toHaveBeenCalled();
  });

  it('cleanup-orphans live run suspends ghosts', async () => {
    const { ctl, cols } = makeController({
      provider_profiles: [{ user_id: 'gone1', status: 'ACTIVE', public_eligibility: true }],
      users: [],
    });
    const out: any = await ctl.cleanupOrphans({ dry_run: false });
    expect(out.ghost_fixed).toBe(1);
    expect(cols.provider_profiles.updateOne).toHaveBeenCalled();
  });
});
