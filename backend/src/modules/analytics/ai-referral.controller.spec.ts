// C6.4 / ccde4f0: AI referrals are anonymous web visitors, but recording sat
// under POST /admin/ai-referrals (anon 401, patient 403), so nothing was ever
// recorded. Recording is now the public, throttled POST /analytics/ai-referral
// beacon; the report stays admin-only. Host matching is on the hostname, not a
// substring of the whole URL. Real MongoDB + the real WriteGuard.
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Reflector } from '@nestjs/core';
import { PATH_METADATA } from '@nestjs/common/constants';
import { WriteGuard } from '../../common/write-guard';
import { PUBLIC_KEY, ROLES_KEY } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { AiReferralBeaconController, AiReferralController } from './ai-referral.controller';
import { AiReferralService, aiReferrerHost } from './ai-referral.service';

jest.setTimeout(60_000);

describe('AI referral tracking (C6.4)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let beacon: AiReferralBeaconController;
  let admin: AiReferralController;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'ai_referrals' }).asPromise();
    const svc = new AiReferralService(conn);
    beacon = new AiReferralBeaconController(svc);
    admin = new AiReferralController(svc);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => { await conn.db!.collection('ai_referrals').deleteMany({}); });

  it('records at the public beacon path, not under admin/', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AiReferralBeaconController)).toBe('analytics/ai-referral');
    const reflector = new Reflector();
    const handler = AiReferralBeaconController.prototype.record;
    expect(reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [handler, AiReferralBeaconController])).toBe(true);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ method: 'POST' }) }),
      getHandler: () => handler,
      getClass: () => AiReferralBeaconController,
    } as never;
    expect(new WriteGuard(reflector).canActivate(ctx)).toBe(true);
    // The admin controller only reads, and only for admins.
    expect(typeof (AiReferralController.prototype as unknown as Record<string, unknown>).record).toBe('undefined');
    expect(reflector.getAllAndOverride<string[]>(ROLES_KEY, [AiReferralController.prototype.stats, AiReferralController])).toEqual([UserRole.ADMIN]);
  });

  it.each([
    ['https://chat.openai.com/share/abc', 'chat.openai.com'],
    ['https://chatgpt.com/c/1', 'chatgpt.com'],
    ['https://www.perplexity.ai/search?q=x', 'perplexity.ai'],
    ['https://gemini.google.com/share/y', 'gemini.google.com'],
    ['https://copilot.microsoft.com/z', 'copilot.microsoft.com'],
    ['https://claude.ai/chat/w', 'claude.ai'],
  ])('records %s grouped by host %s', async (referrer, host) => {
    await expect(beacon.record({ referrer, path: '/ar/p/x' })).resolves.toEqual({ ok: true, host });
    const row = await conn.db!.collection('ai_referrals').findOne({});
    expect(row).toMatchObject({ referrer_host: host, referrer, path: '/ar/p/x' });
  });

  it('matches the hostname, not a substring of the URL', async () => {
    expect(aiReferrerHost('https://evil.example/?claude.ai')).toBeNull();
    expect(aiReferrerHost('https://claude.ai.evil.example/')).toBeNull();
    await expect(beacon.record({ referrer: 'https://evil.example/?claude.ai', path: '/' })).resolves.toEqual({ ok: false, reason: 'not_ai_referrer' });
    expect(await conn.db!.collection('ai_referrals').countDocuments()).toBe(0);
  });

  it('records a visit tagged utm_source=chatgpt.com even without a referrer header', async () => {
    await expect(beacon.record({ utm_source: 'chatgpt.com', path: '/en/medicine-catalog' })).resolves.toEqual({ ok: true, host: 'chatgpt.com' });
    expect(await conn.db!.collection('ai_referrals').findOne({})).toMatchObject({ referrer_host: 'chatgpt.com', utm_source: 'chatgpt.com', referrer: null });
  });

  it('the admin report groups visits per assistant host', async () => {
    await beacon.record({ referrer: 'https://claude.ai/chat/1', path: '/a' });
    await beacon.record({ referrer: 'https://claude.ai/chat/2', path: '/b' });
    await beacon.record({ referrer: 'https://www.perplexity.ai/x', path: '/c' });
    await expect(admin.stats()).resolves.toEqual({ stats: [{ _id: 'claude.ai', count: 2 }, { _id: 'perplexity.ai', count: 1 }] });
  });
});
