// 6ca29c4: the kill-switch helper read FeatureFlagsService.isEnabled, which
// returns false for an absent flag, so every feature without a flag row was
// reported as killed. It was also called by nothing. A missing flag must mean
// "not killed", and the AI gateway must honour an explicit kill switch.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ServiceUnavailableException } from '@nestjs/common';
import { isKilled } from './killswitches.helper';
import { FeatureFlagsService } from '../../modules/feature-flags/feature-flags.service';
import { FeatureFlag, FeatureFlagSchema } from '../../modules/feature-flags/feature-flag.schema';
import { AiGatewayService } from '../../modules/ai/ai-gateway.service';

jest.setTimeout(60_000);

describe('kill switches (6ca29c4)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let flags: Model<FeatureFlag>;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'killswitch' }).asPromise();
    flags = conn.model<FeatureFlag>('FeatureFlag', FeatureFlagSchema);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => { await conn.collection('featureflags').deleteMany({}); });

  it('a feature whose flag row is missing is not killed (real FeatureFlagsService)', async () => {
    const svc = new FeatureFlagsService(flags as never);
    await expect(isKilled('ai', svc as never)).resolves.toBe(false);
  });

  const gateway = async () => {
    await conn.collection('ai_providers').deleteMany({});
    await conn.collection('ai_providers').insertOne({ key: 'gemini', enabled: true, api_key: 'k', model: 'm', priority: 1, daily_quota: 0, used_today: 0, usage_date: '' });
    const s = new AiGatewayService(conn);
    let calls = 0;
    s.setTransportForTests(async () => { calls += 1; return 'answer'; });
    return { s, calls: () => calls };
  };

  it('the AI gateway runs when no kill-switch row exists', async () => {
    const { s, calls } = await gateway();
    await expect(s.generate({ prompt: 'hello', feature: 'translation' })).resolves.toMatchObject({ text: 'answer' });
    expect(calls()).toBe(1);
  });

  it('the AI gateway refuses without calling a provider when ai_gateway_enabled is false', async () => {
    await conn.collection('featureflags').insertOne({ key: 'ai_gateway_enabled', enabled: false });
    const { s, calls } = await gateway();
    await expect(s.generate({ prompt: 'hello again', feature: 'translation' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(calls()).toBe(0);
  });
});
