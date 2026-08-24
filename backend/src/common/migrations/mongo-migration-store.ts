import type { Connection } from 'mongoose';
import type { MigrationRecord, MigrationStore } from './migration-runner';

export const MIGRATIONS_COLLECTION_NAME = 'schema_migrations';
export const MIGRATIONS_LOCK_COLLECTION_NAME = 'schema_migration_locks';
const LOCK_ID = 'global';

type Collection = {
  createIndex(index: Record<string, 1 | -1>, options?: Record<string, unknown>): Promise<unknown>;
  find(query?: Record<string, unknown>): { sort(sort: Record<string, 1 | -1>): { toArray(): Promise<MigrationRecord[]> } };
  insertOne(document: Record<string, unknown>): Promise<unknown>;
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{ matchedCount?: number }>;
  deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount?: number }>;
};

function duplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000;
}

export class MongoMigrationStore implements MigrationStore {
  private readonly migrations: Collection;
  private readonly locks: Collection;

  constructor(connection: Connection) {
    this.migrations = connection.collection(MIGRATIONS_COLLECTION_NAME) as unknown as Collection;
    this.locks = connection.collection(MIGRATIONS_LOCK_COLLECTION_NAME) as unknown as Collection;
  }

  async ensureIndexes(): Promise<void> {
    await this.migrations.createIndex({ id: 1 }, { unique: true, name: 'schema_migrations_id_unique' });
    await this.migrations.createIndex({ state: 1, id: 1 }, { name: 'schema_migrations_state_id' });
  }

  async list(): Promise<MigrationRecord[]> {
    return this.migrations.find({}).sort({ id: 1 }).toArray();
  }

  async begin(record: MigrationRecord): Promise<void> {
    await this.migrations.insertOne(record as unknown as Record<string, unknown>);
  }

  async complete(id: string, at: Date): Promise<void> {
    const result = await this.migrations.updateOne(
      { id, state: 'applying' },
      { $set: { state: 'applied', appliedAt: at, updatedAt: at }, $unset: { failure: '' } },
    );
    if (result.matchedCount !== 1) throw new Error(`migration_record_not_applying:${id}`);
  }

  async fail(id: string, failure: string, at: Date): Promise<void> {
    const result = await this.migrations.updateOne(
      { id, state: 'applying' },
      { $set: { state: 'failed', failure, updatedAt: at } },
    );
    if (result.matchedCount !== 1) throw new Error(`migration_record_not_applying:${id}`);
  }

  async removeApplied(id: string): Promise<void> {
    const result = await this.migrations.deleteOne({ id, state: 'applied' });
    if (result.deletedCount !== 1) throw new Error(`migration_record_not_applied:${id}`);
  }

  async withExclusiveLock<T>(work: () => Promise<T>): Promise<T> {
    const owner = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    try {
      await this.locks.insertOne({ _id: LOCK_ID, owner, acquiredAt: new Date() });
    } catch (error) {
      if (duplicateKey(error)) throw new Error('migration_lock_held_manual_recovery_required');
      throw error;
    }

    try {
      return await work();
    } finally {
      const result = await this.locks.deleteOne({ _id: LOCK_ID, owner });
      if (result.deletedCount !== 1) throw new Error('migration_lock_release_failed_manual_recovery_required');
    }
  }
}
