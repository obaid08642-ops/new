// Q29: GET health/readiness must report the pharmacy duplicate-guard indexes
// (checkPharmacyIndexes) and must not say "ok" while one is missing. A missing
// index after the boot-time ensure must also stop the app from starting.
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { HealthController } from './health.controller';
import { RedisService } from './modules/redis/redis.service';
import {
  PHARMACY_REQUIRED_INDEXES,
  PharmacyIndexesService,
  ensurePharmacyIndexes,
} from './modules/pharmacy/pharmacy-indexes';

jest.setTimeout(60_000);

describe('readiness reports the pharmacy required indexes (Q29)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  const redis = { getClient: () => ({ ping: async () => 'PONG' }) } as unknown as RedisService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'q29' }).asPromise();
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  const allNames = PHARMACY_REQUIRED_INDEXES.map((d) => d.options.name);

  it('is degraded and lists every missing index on a fresh database', async () => {
    const res = await new HealthController(conn, redis).health();
    expect(res.status).toBe('degraded');
    expect(res.details.mongodb).toBe('up');
    expect(res.details.pharmacy_indexes.ok).toBe(false);
    expect([...res.details.pharmacy_indexes.missing].sort()).toEqual([...allNames].sort());
  });

  it('is ok once the indexes exist, and names the one that is dropped', async () => {
    await ensurePharmacyIndexes(conn);
    const ready = await new HealthController(conn, redis).health();
    expect(ready.status).toBe('ok');
    expect(ready.details.pharmacy_indexes).toEqual({ ok: true, missing: [] });

    await conn.collection('pharmacy_broadcast_recipients').dropIndex('pharmacy_broadcast_recipient_unique');
    const after = await new HealthController(conn, redis).health();
    expect(after.status).toBe('degraded');
    expect(after.details.pharmacy_indexes).toEqual({ ok: false, missing: ['pharmacy_broadcast_recipient_unique'] });
  });

  it('boot (onModuleInit) throws when an index is still missing after the ensure', async () => {
    // createIndex succeeds but the index never shows up (e.g. a build that
    // silently fails on a replica): the service must refuse to start.
    const fakeConn = {
      collection: () => ({
        createIndex: async () => 'ignored',
        listIndexes: () => ({ toArray: async () => [{ name: '_id_' }] }),
      }),
    } as unknown as Connection;
    await expect(new PharmacyIndexesService(fakeConn).onModuleInit())
      .rejects.toThrow(/pharmacy_required_indexes_missing:.*pharmacy_broadcast_recipient_unique/);
  });

  it('boot (onModuleInit) creates the indexes on a real database and records ok', async () => {
    const fresh = await mongoose.createConnection(mongo.getUri(), { dbName: 'q29-boot' }).asPromise();
    try {
      const svc = new PharmacyIndexesService(fresh);
      await svc.onModuleInit();
      expect(svc.status).toEqual({ ok: true, missing: [] });
    } finally {
      await fresh.close();
    }
  });
});
