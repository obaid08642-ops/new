/**
 * P3.0a: a password change/reset must end EVERY session derived from the old
 * credential — access tokens (token_version) AND refresh tokens (Redis jti
 * family), for the patient identity AND any linked provider account — and
 * the device that changed it gets a fresh working pair.
 *
 * REAL AuthService/UsersService/controllers + REAL JwtAuthGuard/WriteGuard +
 * REAL bcrypt/JWT over HTTP; persistence is the shared in-memory FakeDb and
 * an in-memory Redis.
 */
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { JwtAuthGuard } from '../../src/common/auth.guard';
import { WriteGuard } from '../../src/common/write-guard';
import { ImpersonationSessionService } from '../../src/common/impersonation-session.service';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersController } from '../../src/modules/users/users.controller';
import { UsersService } from '../../src/modules/users/users.service';
import { RedisService } from '../../src/modules/redis/redis.service';
import { TEST_JWT_SECRET } from './harness';
import { makeDb } from '../support/fake-db';
import { makeRedis } from '../support/fake-redis';

jest.setTimeout(120_000);

describe('P3.0a password change/reset revokes refresh sessions', () => {
  let app: INestApplication;
  let auth: AuthService;
  let db: ReturnType<typeof makeDb>;
  let redis: ReturnType<typeof makeRedis>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    db = makeDb();
    redis = makeRedis();
    const repo = (name: string) => {
      const m = db.model(name);
      return { findOne: m.findOne, find: m.find, create: m.create, updateOne: m.updateOne, updateMany: m.updateMany, countDocuments: m.countDocuments, model: m };
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, UsersController],
      providers: [
        AuthService,
        UsersService,
        { provide: 'UserRepository', useValue: repo('users') },
        { provide: 'PatientProfileRepository', useValue: repo('patient_profiles') },
        { provide: 'ProviderProfileRepository', useValue: repo('provider_profiles') },
        { provide: RedisService, useValue: redis.service },
        { provide: JwtService, useValue: new JwtService({ secret: TEST_JWT_SECRET }) },
        { provide: EventEmitter2, useValue: { emit: () => true } },
        Reflector,
        { provide: getConnectionToken(), useValue: { collection: (n: string) => db.collection(n), model: () => null } },
        { provide: ImpersonationSessionService, useValue: {} },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: WriteGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
    auth = moduleRef.get(AuthService);
  });
  afterAll(async () => { await app?.close(); });

  /** Patient with a linked provider account (P2.1 shape: account.id === user.id) and one live provider session. */
  async function seedUser(id: string, password: string) {
    await db.collection('users').insertOne({ id, phone: `+9665${id.length}${Date.now() % 1e7}`, role: 'patient', active: true, token_version: 0, password_hash: await bcrypt.hash(password, 4) });
    await db.collection('provider_accounts').insertOne({ id, user_id: id, email: `${id}@example.test`, provider_type: 'doctor', status: 'approved', token_version: 0 });
    await db.collection('provider_sessions').insertOne({ id: `ps-${id}`, provider_account_id: id, status: 'active', device_identifier: 'tablet' });
  }
  /** Mint a device session exactly like login does (awaits the refresh-session write). */
  async function session(id: string, device: string) {
    const u: any = await db.collection('users').findOne({ id }).lean();
    const t = auth.signToken(u, device);
    await new Promise((r) => setImmediate(r));
    return t;
  }
  const refresh = (rt: string, device: string) =>
    http().post('/api/v1/auth/refresh').set('x-device-id', device).send({ refresh_token: rt });
  const sessions = (at: string) => http().get('/api/v1/users/me/sessions').set('Authorization', `Bearer ${at}`);

  it('change-password: other devices lose access AND refresh; this device gets a fresh working pair', async () => {
    await seedUser('pw-change-1', 'OldPass123');
    const phone = await session('pw-change-1', 'dev-phone');
    const laptop = await session('pw-change-1', 'dev-laptop');
    await sessions(laptop.accessToken).expect(200);

    const res = await http().post('/api/v1/users/me/change-password')
      .set('Authorization', `Bearer ${phone.accessToken}`).set('x-device-id', 'dev-phone')
      .send({ current_password: 'OldPass123', new_password: 'NewPass456' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.access_token).toBeTruthy();
    expect(res.body.refresh_token).toBeTruthy();

    // The changing device keeps working and can rotate its new refresh token.
    await sessions(res.body.access_token).expect(200);
    const rotated = await refresh(res.body.refresh_token, 'dev-phone');
    expect([200, 201]).toContain(rotated.status);
    // Old access tokens die via token_version.
    await sessions(laptop.accessToken).expect(401);
    await sessions(phone.accessToken).expect(401);
    // Stolen pre-change refresh tokens can no longer mint access...
    await refresh(laptop.refreshToken, 'dev-laptop').expect(401);
    // ...and replaying one is treated as theft: the whole family is revoked
    // (pre-existing reuse detection), so the rotated token dies too.
    await refresh(rotated.body.refreshToken, 'dev-phone').expect(401);
    await refresh(phone.refreshToken, 'dev-phone').expect(401);
  });

  it('change-password also ends the linked provider sessions (shared credential)', async () => {
    const acc: any = await db.collection('provider_accounts').findOne({ id: 'pw-change-1' }).lean();
    expect(Number(acc.token_version)).toBe(1);
    const ps: any = await db.collection('provider_sessions').findOne({ id: 'ps-pw-change-1' }).lean();
    expect(ps.status).toBe('revoked');
  });

  it('wrong current password → 401 and nothing is revoked', async () => {
    await seedUser('pw-change-2', 'OldPass123');
    const phone = await session('pw-change-2', 'dev-phone');
    await http().post('/api/v1/users/me/change-password')
      .set('Authorization', `Bearer ${phone.accessToken}`)
      .send({ current_password: 'nope-nope', new_password: 'NewPass456' })
      .expect(401);
    await sessions(phone.accessToken).expect(200);
    const again = await refresh(phone.refreshToken, 'dev-phone');
    expect([200, 201]).toContain(again.status);
  });

  it('patient reset (password/reset) revokes every refresh session and access token', async () => {
    await seedUser('pw-reset-1', 'OldPass123');
    const phone = await session('pw-reset-1', 'dev-phone');
    await redis.service.setJson('auth:password:reset:tok-1', { user_id: 'pw-reset-1' });
    const r = await http().post('/api/v1/auth/password/reset').send({ reset_token: 'tok-1', new_password: 'NewPass456' });
    expect([200, 201]).toContain(r.status);
    await refresh(phone.refreshToken, 'dev-phone').expect(401);
    await sessions(phone.accessToken).expect(401);
    const ps: any = await db.collection('provider_sessions').findOne({ id: 'ps-pw-reset-1' }).lean();
    expect(ps.status).toBe('revoked');
  });
});
