import * as fs from 'fs';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { computePlan, PACKAGED_TEST_REMOVAL } from './catalogue-apply';
import type { DbLike } from '../modules/catalogs/catalogue-apply.core';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri(), { dbName: 'only_test_data' }); });
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

describe('catalogue-apply --only=test_data --test-data-remove=packaged', () => {
  it('the packaged list holds the eight owner-approved prefixes', () => {
    const list = JSON.parse(fs.readFileSync(PACKAGED_TEST_REMOVAL, 'utf8')) as { profile_ids: string[] };
    expect(list.profile_ids).toEqual(['c142700b', 'f3dee443', '7210a983', 'ef370e52', 'c6c5fc49', 'b5a68ef0', '2789f626', 'b74edab0']);
  });

  it('plans only the removal: none of the other steps, and nothing at all when the providers are gone', async () => {
    const db = mongoose.connection.db!;
    await db.collection('provider_profiles').insertOne({ id: 'c142700b-1111-4111-8111-000000000002', user_id: 'u1', account_id: 'a1', type: 'pharmacy', name_ar: 'x' });
    await db.collection('provider_accounts').insertOne({ id: 'a1', user_id: 'u1' });
    await db.collection('users').insertOne({ id: 'u1' });
    const p = await computePlan(db as unknown as DbLike, ['plan', '--only=test_data', '--test-data-remove=packaged']);
    expect(p.changes.map((c) => c.step)).toEqual(['test_data', 'test_data', 'test_data']);
    expect(Object.keys(p.report)).toEqual(['test_data']);
    expect(p.report.test_data).toMatchObject({ resolved_ids: { c142700b: 'c142700b-1111-4111-8111-000000000002' }, deletes: { provider_profiles: 1, provider_accounts: 1, users: 1 } });
    await db.collection('provider_profiles').deleteMany({}); await db.collection('provider_accounts').deleteMany({}); await db.collection('users').deleteMany({});
    expect((await computePlan(db as unknown as DbLike, ['plan', '--only=test_data', '--test-data-remove=packaged'])).changes).toEqual([]);
  });
});
