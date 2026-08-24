import { MigrationRunner, type Migration, type MigrationRecord, type MigrationStore } from './migration-runner';

class MemoryStore implements MigrationStore {
  records = new Map<string, MigrationRecord>();
  locked = false;
  indexesEnsured = 0;

  async ensureIndexes() { this.indexesEnsured += 1; }
  async list() { return [...this.records.values()].sort((a, b) => a.id.localeCompare(b.id)); }
  async begin(record: MigrationRecord) {
    if (this.records.has(record.id)) throw new Error(`duplicate:${record.id}`);
    this.records.set(record.id, { ...record });
  }
  async complete(id: string, at: Date) {
    const record = this.records.get(id);
    if (!record || record.state !== 'applying') throw new Error(`not_applying:${id}`);
    this.records.set(id, { ...record, state: 'applied', updatedAt: at, appliedAt: at });
  }
  async fail(id: string, failure: string, at: Date) {
    const record = this.records.get(id);
    if (!record || record.state !== 'applying') throw new Error(`not_applying:${id}`);
    this.records.set(id, { ...record, state: 'failed', failure, updatedAt: at });
  }
  async removeApplied(id: string) {
    const record = this.records.get(id);
    if (!record || record.state !== 'applied') throw new Error(`not_applied:${id}`);
    this.records.delete(id);
  }
  async withExclusiveLock<T>(work: () => Promise<T>): Promise<T> {
    if (this.locked) throw new Error('migration_lock_held_manual_recovery_required');
    this.locked = true;
    try { return await work(); } finally { this.locked = false; }
  }
}

const checksum = (char: string) => char.repeat(64);
const migration = (id: string, counters: { up: number; down: number }, fail = false): Migration => ({
  id,
  checksum: checksum(id === 'migrate_a' ? 'a' : 'b'),
  async up() { counters.up += 1; if (fail) throw new Error('boom'); },
  async down() { counters.down += 1; },
});

describe('MigrationRunner', () => {
  const now = jest.fn(() => new Date('2026-08-24T00:00:00.000Z'));

  beforeEach(() => now.mockClear());

  it('applies a new migration once and reports it as applied', async () => {
    const store = new MemoryStore(); const counters = { up: 0, down: 0 }; const item = migration('migrate_a', counters);
    const runner = new MigrationRunner(store, { db: {} }, now);
    await expect(runner.up([item])).resolves.toEqual(['migrate_a']);
    await expect(runner.up([item])).resolves.toEqual([]);
    expect(counters.up).toBe(1);
    await expect(runner.status([item])).resolves.toEqual([{ id: 'migrate_a', checksum: item.checksum, state: 'applied', checksumMatches: true, appliedAt: '2026-08-24T00:00:00.000Z' }]);
    expect(store.indexesEnsured).toBeGreaterThan(0);
  });

  it('rejects a changed checksum for an existing migration', async () => {
    const store = new MemoryStore(); const counters = { up: 0, down: 0 }; const item = migration('migrate_a', counters);
    const runner = new MigrationRunner(store, { db: {} }, now);
    await runner.up([item]);
    await expect(runner.up([{ ...item, checksum: checksum('c') }])).rejects.toThrow('migration_checksum_mismatch:migrate_a');
  });

  it('records a failed migration and refuses unsafe replay', async () => {
    const store = new MemoryStore(); const counters = { up: 0, down: 0 }; const item = migration('migrate_a', counters, true);
    const runner = new MigrationRunner(store, { db: {} }, now);
    await expect(runner.up([item])).rejects.toThrow('boom');
    await expect(runner.up([item])).rejects.toThrow('migration_requires_manual_recovery:migrate_a:failed');
    expect(counters.up).toBe(1);
  });

  it('allows rollback only for the most recent applied migration', async () => {
    const store = new MemoryStore(); const first = { up: 0, down: 0 }; const second = { up: 0, down: 0 };
    const a = migration('migrate_a', first); const b = migration('migrate_b', second);
    const runner = new MigrationRunner(store, { db: {} }, now);
    await runner.up([a, b]);
    await expect(runner.down([a, b], 'migrate_a')).rejects.toThrow('migration_down_must_be_last_applied:migrate_a');
    await expect(runner.down([a, b], 'migrate_b')).resolves.toEqual({ rolledBack: true, id: 'migrate_b' });
    expect(second.down).toBe(1);
  });

  it('rejects invalid and duplicate registry entries before execution', async () => {
    const store = new MemoryStore(); const counters = { up: 0, down: 0 }; const item = migration('migrate_a', counters);
    const runner = new MigrationRunner(store, { db: {} }, now);
    await expect(runner.up([{ ...item, id: 'x' }])).rejects.toThrow('migration_invalid_id:x');
    await expect(runner.up([item, item])).rejects.toThrow('migration_duplicate_id:migrate_a');
    expect(counters.up).toBe(0);
  });
});
