import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';
import { ensureOrderingIndexes, ProviderOrderingService } from './provider-ordering.service';

// Starting the in-memory MongoDB can take longer than the 5 s default hook timeout on a busy machine.
jest.setTimeout(120_000);

// M1 — concurrent writes never leave two declarations for one (provider, kind, catalogue item), and the indexes exist.
describe('provider ordering: concurrent writes keep one row', () => {
  let server: MongoMemoryServer;
  let conn: Connection;
  let svc: ProviderOrderingService;
  const LAB = 'lab-conc';

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(server.getUri(), { dbName: 'ordering_conc' }).asPromise();
    await conn.collection('lab_services').insertOne({ id: 'cbc', code: 'CBC', name_ar: 'صورة دم', active: true });
    await conn.collection('provider_ordering_settings').insertOne({ provider_account_id: LAB, modes: ['facility'], accepted_insurance: [] });
    svc = new ProviderOrderingService(conn);
  });
  afterAll(async () => {
    await conn?.close();
    await server?.stop();
  });

  it('creates the unique indexes and is safe to run twice', async () => {
    await ensureOrderingIndexes(conn);
    await ensureOrderingIndexes(conn);
    const idx = await conn.collection('provider_ordering_items').indexes();
    expect(idx.find((i) => i.name === 'ordering_item_unique')?.unique).toBe(true);
    const settings = await conn.collection('provider_ordering_settings').indexes();
    expect(settings.find((i) => i.name === 'ordering_settings_unique')?.unique).toBe(true);
  });

  it('ten simultaneous declarations of the same item leave one row', async () => {
    const user = { id: LAB, role: 'lab', provider_type: 'lab' };
    const body = { service_kind: 'lab' as const, catalog_id: 'cbc', prices: { facility: 40 } };
    await Promise.all(Array.from({ length: 10 }, () => svc.putItem(user, body)));
    const n = await conn.collection('provider_ordering_items').countDocuments({ provider_account_id: LAB, catalog_id: 'cbc' });
    expect(n).toBe(1);
  });
});
