import { createHash } from 'node:crypto';

export type MigrationContext = {
  db: unknown;
};

export type Migration = {
  id: string;
  checksum: string;
  up(context: MigrationContext): Promise<void>;
  down(context: MigrationContext): Promise<void>;
};

export type MigrationState = 'applying' | 'applied' | 'failed';

export type MigrationRecord = {
  id: string;
  checksum: string;
  state: MigrationState;
  createdAt: Date;
  updatedAt: Date;
  appliedAt?: Date;
  failure?: string;
};

export type MigrationStore = {
  ensureIndexes(): Promise<void>;
  list(): Promise<MigrationRecord[]>;
  begin(record: MigrationRecord): Promise<void>;
  complete(id: string, at: Date): Promise<void>;
  fail(id: string, failure: string, at: Date): Promise<void>;
  removeApplied(id: string): Promise<void>;
  withExclusiveLock<T>(work: () => Promise<T>): Promise<T>;
};

export function migrationChecksum(source: string): string {
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : 'migration_failed';
}

function validateRegistry(migrations: readonly Migration[]): void {
  const seen = new Set<string>();
  for (const migration of migrations) {
    if (!/^[a-z0-9][a-z0-9_-]{2,120}$/i.test(migration.id)) {
      throw new Error(`migration_invalid_id:${migration.id}`);
    }
    if (!/^[a-f0-9]{64}$/i.test(migration.checksum)) {
      throw new Error(`migration_invalid_checksum:${migration.id}`);
    }
    if (seen.has(migration.id)) throw new Error(`migration_duplicate_id:${migration.id}`);
    seen.add(migration.id);
  }
}

export class MigrationRunner {
  constructor(
    private readonly store: MigrationStore,
    private readonly context: MigrationContext,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async status(migrations: readonly Migration[]) {
    validateRegistry(migrations);
    await this.store.ensureIndexes();
    const records = await this.store.list();
    const recordById = new Map(records.map((record) => [record.id, record]));
    return migrations.map((migration) => {
      const record = recordById.get(migration.id);
      return {
        id: migration.id,
        checksum: migration.checksum,
        state: record?.state ?? 'pending',
        checksumMatches: !record || record.checksum === migration.checksum,
        appliedAt: record?.appliedAt?.toISOString(),
      };
    });
  }

  async up(migrations: readonly Migration[]) {
    validateRegistry(migrations);
    return this.store.withExclusiveLock(async () => {
      await this.store.ensureIndexes();
      const records = await this.store.list();
      const recordById = new Map(records.map((record) => [record.id, record]));
      const applied: string[] = [];

      for (const migration of migrations) {
        const existing = recordById.get(migration.id);
        if (existing) {
          if (existing.checksum !== migration.checksum) throw new Error(`migration_checksum_mismatch:${migration.id}`);
          if (existing.state === 'applied') continue;
          // Replaying after an interrupted mutation is unsafe without a domain-specific repair plan.
          throw new Error(`migration_requires_manual_recovery:${migration.id}:${existing.state}`);
        }

        const startedAt = this.now();
        await this.store.begin({
          id: migration.id,
          checksum: migration.checksum,
          state: 'applying',
          createdAt: startedAt,
          updatedAt: startedAt,
        });
        try {
          await migration.up(this.context);
          const finishedAt = this.now();
          await this.store.complete(migration.id, finishedAt);
          applied.push(migration.id);
        } catch (error) {
          try {
            await this.store.fail(migration.id, errorMessage(error), this.now());
          } catch {
            // The original migration error remains the primary failure; an operator must inspect storage.
          }
          throw error;
        }
      }
      return applied;
    });
  }

  async down(migrations: readonly Migration[], id: string) {
    validateRegistry(migrations);
    return this.store.withExclusiveLock(async () => {
      await this.store.ensureIndexes();
      const migration = migrations.find((candidate) => candidate.id === id);
      if (!migration) throw new Error(`migration_not_found:${id}`);
      const records = await this.store.list();
      const recordById = new Map(records.map((record) => [record.id, record]));
      const record = recordById.get(id);
      if (!record) return { rolledBack: false, id };
      if (record.checksum !== migration.checksum) throw new Error(`migration_checksum_mismatch:${id}`);
      if (record.state !== 'applied') throw new Error(`migration_requires_manual_recovery:${id}:${record.state}`);

      const lastApplied = [...migrations].reverse().find((candidate) => recordById.get(candidate.id)?.state === 'applied');
      if (lastApplied?.id !== id) throw new Error(`migration_down_must_be_last_applied:${id}`);

      await migration.down(this.context);
      await this.store.removeApplied(id);
      return { rolledBack: true, id };
    });
  }
}
