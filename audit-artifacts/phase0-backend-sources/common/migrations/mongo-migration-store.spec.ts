import { MongoMigrationStore, MIGRATIONS_COLLECTION_NAME } from './mongo-migration-store';

describe('MongoMigrationStore', () => {
  it('uses a dedicated schema_migrations collection and delegates ordered reads and writes', async () => {
    const records: any[] = [];
    const collection = {
      find: jest.fn(() => ({ sort: jest.fn(() => ({ toArray: jest.fn(async () => [...records]) })) })),
      insertOne: jest.fn(async (record: any) => { records.push(record); }),
      deleteOne: jest.fn(async ({ id }: { id: string }) => { const index = records.findIndex((record) => record.id === id); if (index >= 0) records.splice(index, 1); }),
    };
    const connection = { collection: jest.fn(() => collection) } as any;
    const store = new MongoMigrationStore(connection);
    const record = { id: '20260823-baseline', checksum: 'checksum', appliedAt: new Date() };

    expect(MIGRATIONS_COLLECTION_NAME).toBe('schema_migrations');
    await store.insert(record);
    expect(await store.list()).toHaveLength(1);
    await store.remove(record.id);
    expect(await store.list()).toHaveLength(0);
    expect(connection.collection).toHaveBeenCalledWith('schema_migrations');
  });
});
