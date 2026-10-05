// a006d5a (review round 2): latestVitals issued one findOne per vital type
// (6 queries per dashboard load). It is now one aggregate over the
// { patient_id, type, measured_at, deleted_at } index, with the same result.
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { HealthService } from './health.service';
import { VitalReadingSchema } from '../../schemas/health.schema';
import { MongoRepository } from '../../common/database/mongo.repository';

jest.setTimeout(60_000);

describe('latestVitals is one aggregate (a006d5a)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let service: HealthService;
  const queries: string[] = [];

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'vitals' }).asPromise();
    const model = conn.model('VitalReading', VitalReadingSchema);
    class Repo extends MongoRepository<never> {}
    service = new HealthService(new Repo(model as never) as never, {} as never, {} as never, {} as never, conn as never);
    const at = (d: string) => new Date(`2026-09-${d}T08:00:00Z`);
    await model.collection.insertMany([
      { id: 'a', patient_id: 'p1', type: 'bp', value: '120/80', measured_at: at('01'), deleted_at: null },
      { id: 'b', patient_id: 'p1', type: 'bp', value: '130/85', measured_at: at('03'), deleted_at: null },
      { id: 'c', patient_id: 'p1', type: 'bp', value: '140/90', measured_at: at('05'), deleted_at: at('06') },
      { id: 'd', patient_id: 'p1', type: 'glucose', value: '102', measured_at: at('02') },
      { id: 'e', patient_id: 'p2', type: 'weight', value: '80', measured_at: at('04'), deleted_at: null },
    ]);
    mongoose.set('debug', (collection: string, method: string) => { if (method !== 'createIndex') queries.push(`${collection}.${method}`); });
  });
  afterAll(async () => { mongoose.set('debug', false); await conn.close(); await mongo.stop(); });

  it('returns the newest non-deleted reading per type with a single query', async () => {
    queries.length = 0;
    const out = await service.latestVitals({ id: 'p1' });
    expect(queries).toEqual(['vitalreadings.aggregate']);
    expect(Object.keys(out).sort()).toEqual(['bp', 'glucose']);
    expect(out.bp).toMatchObject({ id: 'b', value: '130/85' });
    expect(out.glucose).toMatchObject({ id: 'd' });
    expect(out.bp._id).toBeUndefined();
  });
});
