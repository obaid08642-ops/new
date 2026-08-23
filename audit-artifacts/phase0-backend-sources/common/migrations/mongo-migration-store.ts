import type { Connection } from 'mongoose';
import type { MigrationRecord, MigrationStore } from './migration-runner';

const COLLECTION_NAME = 'schema_migrations';

type MigrationCollection = {
  find(query?: Record<string, unknown>): { sort(sort: Record<string, 1 | -1>): { toArray(): Promise<MigrationRecord[]> } };
  insertOne(document: MigrationRecord): Promise<unknown>;
  deleteOne(filter: { id: string }): Promise<unknown>;
};

export class MongoMigrationStore implements MigrationStore {
  private readonly collection: MigrationCollection;

  constructor(connection: Connection) {
    this.collection = connection.collection(COLLECTION_NAME) as unknown as MigrationCollection;
  }

  async list(): Promise<MigrationRecord[]> {
    return this.collection.find({}).sort({ id: 1 }).toArray();
  }

  async insert(record: MigrationRecord): Promise<void> {
    await this.collection.insertOne(record);
  }

  async remove(id: string): Promise<void> {
    await this.collection.deleteOne({ id });
  }
}

export { COLLECTION_NAME as MIGRATIONS_COLLECTION_NAME };
