import { MigrationRunner, migrationChecksum, type Migration, type MigrationRecord } from './migration-runner';

describe('MigrationRunner', () => {
  const applied: MigrationRecord[] = [];
  const calls: string[] = [];
  const store = {
    list: jest.fn(async () => [...applied]),
    insert: jest.fn(async (record: MigrationRecord) => { applied.push(record); }),
    remove: jest.fn(async (id: string) => { const index = applied.findIndex((record) => record.id === id); if (index >= 0) applied.splice(index, 1); }),
  };
  const migration: Migration = {
    id: '20260823-contract-baseline',
    checksum: migrationChecksum('contract-baseline-v1'),
    up: async () => { calls.push('up'); },
    down: async () => { calls.push('down'); },
  };

  beforeEach(() => {
    applied.length = 0;
    calls.length = 0;
    jest.clearAllMocks();
  });

  it('applies a migration once and treats the same version as idempotent', async () => {
    const runner = new MigrationRunner(store, { db: {} });
    await runner.up([migration]);
    await runner.up([migration]);
    expect(calls).toEqual(['up']);
    expect(store.insert).toHaveBeenCalledTimes(1);
  });

  it('rejects a changed migration checksum', async () => {
    const runner = new MigrationRunner(store, { db: {} });
    await runner.up([migration]);
    await expect(runner.up([{ ...migration, checksum: migrationChecksum('changed') }])).rejects.toThrow('migration_checksum_mismatch');
  });

  it('rolls back an applied migration only after matching its checksum', async () => {
    const runner = new MigrationRunner(store, { db: {} });
    await runner.up([migration]);
    await runner.down([migration], migration.id);
    expect(calls).toEqual(['up', 'down']);
    expect(applied).toHaveLength(0);
  });
});
