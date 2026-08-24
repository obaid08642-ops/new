import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MigrationRunner, migrationChecksum, type Migration } from './migration-runner';
import { MIGRATIONS_COLLECTION_NAME, MongoMigrationStore } from './mongo-migration-store';

jest.setTimeout(240_000);

describe('MongoMigrationStore integration', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { storageEngine: 'wiredTiger' } });
    await mongoose.connect(mongo.getUri(), { serverSelectionTimeoutMS: 10_000 });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('persists an applied migration, enforces its status, and rolls back the last migration', async () => {
    const source = 'phase0_fixture_create_v1';
    const migration: Migration = {
      id: 'phase0_fixture_create',
      checksum: migrationChecksum(source),
      async up(context) {
        const db = context.db as mongoose.Connection;
        await db.collection('phase0_fixture_records').insertOne({ id: 'fixture-1' });
      },
      async down(context) {
        const db = context.db as mongoose.Connection;
        await db.collection('phase0_fixture_records').deleteOne({ id: 'fixture-1' });
      },
    };
    const store = new MongoMigrationStore(mongoose.connection);
    const runner = new MigrationRunner(store, { db: mongoose.connection });

    await expect(runner.up([migration])).resolves.toEqual(['phase0_fixture_create']);
    await expect(mongoose.connection.collection('phase0_fixture_records').countDocuments({ id: 'fixture-1' })).resolves.toBe(1);
    await expect(mongoose.connection.collection(MIGRATIONS_COLLECTION_NAME).findOne({ id: migration.id })).resolves.toMatchObject({ state: 'applied', checksum: migration.checksum });
    await expect(runner.status([migration])).resolves.toEqual([expect.objectContaining({ id: migration.id, state: 'applied', checksumMatches: true })]);

    await expect(runner.down([migration], migration.id)).resolves.toEqual({ rolledBack: true, id: migration.id });
    await expect(mongoose.connection.collection('phase0_fixture_records').countDocuments({ id: 'fixture-1' })).resolves.toBe(0);
    await expect(mongoose.connection.collection(MIGRATIONS_COLLECTION_NAME).findOne({ id: migration.id })).resolves.toBeNull();
  });
});
