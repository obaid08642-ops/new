import { GuestLifecycleService } from './guest-lifecycle.service';

/**
 * Phase 21 — guest lifecycle. Mocked models + boundary dates, no DB.
 * Proves: disabled by default, dry-run writes nothing, order-linked guests
 * are anonymized (never deleted), order-free guests are deleted, unknown
 * linkage fails closed, and candidates are filtered by inactivity.
 */
describe('GuestLifecycleService', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV, GUEST_LIFECYCLE_ENABLED: 'true', GUEST_LIFECYCLE_MONTHS: '12' };
  });
  afterEach(() => { process.env = OLD_ENV; });

  /** Build a service whose order-linkage resolves per guest id. */
  const svc = (guests: any[], linkedIds: Set<string> = new Set(), countsThrow = false) => {
    const service: any = Object.create(GuestLifecycleService.prototype);
    service.logger = { log: jest.fn() };
    // Linkage is answered per guest from the filter's id (any collection, any owner field).
    const linkedFor = (filter: any) => {
      const ids: string[] = JSON.stringify(filter).match(/"\$eq":"([^"]+)"/g) ?? [];
      return ids.some((m) => linkedIds.has(m.slice(7, -1))) ? 1 : 0;
    };
    service.users = {
      find: jest.fn(() => ({ select: jest.fn(() => ({ lean: jest.fn(async () => guests) })) })),
      deleteOne: jest.fn(async () => ({})),
      updateOne: jest.fn(async () => ({})),
      db: {
        collection: jest.fn(() => ({
          countDocuments: jest.fn(async (filter: any) => {
            if (countsThrow) throw new Error('db down');
            return linkedFor(filter);
          }),
          deleteMany: jest.fn(async () => ({})),
        })),
      },
    };
    return service;
  };

  it('does nothing when disabled (default)', async () => {
    process.env.GUEST_LIFECYCLE_ENABLED = 'false';
    const service = svc([{ id: 'g1' }]);
    await expect(service.run()).resolves.toMatchObject({ ran: false });
    expect(service.users.deleteOne).not.toHaveBeenCalled();
    expect(service.users.updateOne).not.toHaveBeenCalled();
  });

  it('deletes order-free guests and anonymizes order-linked ones', async () => {
    const service = svc([{ id: 'g-free' }, { id: 'g-linked' }], new Set(['g-linked']));
    const res: any = await service.run();
    expect(res).toMatchObject({ ran: true, candidates: 2, deleted: 1, anonymised: 1 });
    expect(service.users.deleteOne).toHaveBeenCalledWith({ id: 'g-free' });
    expect(service.users.updateOne).toHaveBeenCalledWith(
      { id: 'g-linked' },
      expect.objectContaining({ $set: expect.objectContaining({ full_name: 'Deleted Guest', active: false }) }),
    );
  });

  it('fails closed when linkage lookup throws (anonymize, never delete)', async () => {
    const service = svc([{ id: 'g1' }], new Set(), true);
    const res: any = await service.run();
    expect(service.users.deleteOne).not.toHaveBeenCalled();
    expect(res.anonymised).toBe(1);
  });

  it('dry-run writes nothing', async () => {
    process.env.GUEST_LIFECYCLE_DRY_RUN = 'true';
    const service = svc([{ id: 'g1' }]);
    const res: any = await service.run();
    expect(service.users.deleteOne).not.toHaveBeenCalled();
    expect(service.users.updateOne).not.toHaveBeenCalled();
    expect(res.dryRun).toBe(true);
  });

  it('candidates are filtered by is_guest + inactivity in one query', async () => {
    const service = svc([]);
    let seenQuery: any = null;
    service.users.find = jest.fn((q: any) => {
      seenQuery = q;
      return { select: jest.fn(() => ({ lean: jest.fn(async () => []) })) };
    });
    await service.run();
    expect(seenQuery.is_guest).toBe(true);
    expect(JSON.stringify(seenQuery)).toContain('last_login_at');
  });
});
