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

export type MigrationRecord = {
  id: string;
  checksum: string;
  appliedAt: Date;
};

export type MigrationStore = {
  list(): Promise<MigrationRecord[]>;
  insert(record: MigrationRecord): Promise<void>;
  remove(id: string): Promise<void>;
};

export function migrationChecksum(source: string): string {
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

export class MigrationRunner {
  constructor(
    private readonly store: MigrationStore,
    private readonly context: MigrationContext,
  ) {}

  async status(migrations: readonly Migration[]) {
    const applied = await this.store.list();
    const appliedById = new Map(applied.map((record) => [record.id, record]));
    return migrations.map((migration) => ({
      id: migration.id,
      checksum: migration.checksum,
      applied: appliedById.has(migration.id),
      checksumMatches: !appliedById.has(migration.id) || appliedById.get(migration.id)?.checksum === migration.checksum,
    }));
  }

  async up(migrations: readonly Migration[]) {
    const applied = await this.store.list();
    const appliedById = new Map(applied.map((record) => [record.id, record]));
    for (const migration of migrations) {
      const existing = appliedById.get(migration.id);
      if (existing) {
        if (existing.checksum !== migration.checksum) throw new Error(`migration_checksum_mismatch:${migration.id}`);
        continue;
      }
      await migration.up(this.context);
      await this.store.insert({ id: migration.id, checksum: migration.checksum, appliedAt: new Date() });
    }
  }

  async down(migrations: readonly Migration[], id: string) {
    const migration = migrations.find((candidate) => candidate.id === id);
    if (!migration) throw new Error(`migration_not_found:${id}`);
    const applied = await this.store.list();
    const record = applied.find((candidate) => candidate.id === id);
    if (!record) return;
    if (record.checksum !== migration.checksum) throw new Error(`migration_checksum_mismatch:${id}`);
    await migration.down(this.context);
    await this.store.remove(id);
  }
}
