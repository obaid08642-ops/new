// 13f560c: the push fan-out read at most 20 tokens (unsorted), so a user's
// 21st device and beyond silently never got a push. The hot-path indexes the
// review lists were only described in a markdown file, and the expiring OTP
// codes had no TTL index. Every active token is now sent in provider-sized
// batches, and the indexes are declared on the Mongoose schemas.
jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn() } }));
import axios from 'axios';
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NotificationsService } from './notifications.service';
import { PushTokenSchema } from '../push/push.module';
import { InsuranceCompanySchema, InsuranceNetworkSchema } from '../../schemas/insurance.schema';
import { ProviderOtpCodeSchema } from '../provider/schemas';

jest.setTimeout(60_000);

const post = axios.post as jest.Mock;

describe('push fan-out and hot-path indexes (13f560c)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'fanout' }).asPromise();
    conn.model('PushToken', PushTokenSchema);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  const service = () => new NotificationsService({ db: conn } as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);

  it('sends to every active device, in Expo batches of at most 100', async () => {
    const tokens = Array.from({ length: 150 }, (_, i) => ({ token: `ExponentPushToken[dev-${i}]`, user_id: 'u-many', provider: 'expo', active: true }));
    await conn.model('PushToken').insertMany([...tokens, { token: 'ExponentPushToken[old]', user_id: 'u-many', provider: 'expo', active: false }]);
    post.mockReset();
    post.mockImplementation(async (_url: string, msgs: unknown[]) => ({ data: { data: msgs.map(() => ({ status: 'ok' })) } }));

    const sent = await service().sendPush({ user_id: 'u-many', title: 't', body: 'b', type: 'info' });

    expect(sent).toBe(true);
    const batches = post.mock.calls.map((c) => c[1] as Array<{ to: string }>);
    expect(batches.every((b) => b.length <= 100)).toBe(true);
    const delivered = batches.flat().map((m) => m.to).sort();
    expect(delivered).toEqual(tokens.map((t) => t.token).sort());
  });

  it('declares the hot-path and TTL indexes on the schemas', async () => {
    const companies = conn.model('InsuranceCompany', InsuranceCompanySchema);
    const networks = conn.model('InsuranceNetwork', InsuranceNetworkSchema);
    const otps = conn.model('ProviderOtpCode', ProviderOtpCodeSchema);
    await Promise.all([companies.syncIndexes(), networks.syncIndexes(), otps.syncIndexes()]);
    const keys = async (m: { collection: mongoose.Collection }) => (await m.collection.indexes()).map((i) => ({ key: i.key, ttl: i.expireAfterSeconds }));

    expect(await keys(companies)).toContainEqual({ key: { is_active: 1, name_en: 1 }, ttl: undefined });
    expect(await keys(networks)).toContainEqual({ key: { catalog_status: 1, company_id: 1 }, ttl: undefined });
    expect(await keys(otps)).toContainEqual({ key: { expires_at: 1 }, ttl: 86400 });
  });
});
