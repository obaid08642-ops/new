/**
 * P3.0b: users is the single source of truth for passwords.
 *   - provider login verifies the linked users.password_hash (never the
 *     provider_accounts copy);
 *   - patient change-password, provider reset-password and provider
 *     change-password all write users only, and the new password works on
 *     BOTH logins while the old one fails on both;
 *   - legacy /provider/auth/register creates the linked users row.
 *
 * REAL ProviderAuthService/AuthService/UsersService + controllers + REAL
 * guards/bcrypt/JWT over HTTP; persistence is the shared in-memory FakeDb and
 * an in-memory Redis; OTP delivery/verification is stubbed.
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
import { ProviderAuthController } from '../../src/modules/provider/provider.controllers';
import { ProviderAuthService } from '../../src/modules/provider/services/provider-auth.service';
import { ProviderOtpService } from '../../src/modules/provider/services/provider-otp.service';
import { TEST_JWT_SECRET } from './harness';
import { makeDb } from '../support/fake-db';
import { makeRedis } from '../support/fake-redis';

jest.setTimeout(120_000);

describe('P3.0b single credential: provider login uses users.password_hash', () => {
  let app: INestApplication;
  let auth: AuthService;
  let db: ReturnType<typeof makeDb>;
  const http = () => request(app.getHttpServer());
  const providerLogin = (email: string, password: string) => http().post('/api/v1/provider/auth/login').send({ email, password });
  const hashOf = async (col: string, id: string) => ((await db.collection(col).findOne({ id }).lean()) as any)?.password_hash;

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    db = makeDb();
    const redis = makeRedis();
    const repo = (name: string) => {
      const m = db.model(name);
      return { findOne: m.findOne, find: m.find, create: m.create, updateOne: m.updateOne, updateMany: m.updateMany, countDocuments: m.countDocuments, model: m };
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, UsersController, ProviderAuthController],
      providers: [
        AuthService,
        UsersService,
        ProviderAuthService,
        { provide: 'UserRepository', useValue: repo('users') },
        { provide: 'PatientProfileRepository', useValue: repo('patient_profiles') },
        { provide: 'ProviderProfileRepository', useValue: repo('provider_profiles') },
        { provide: 'ProviderAccountRepository', useValue: repo('provider_accounts') },
        { provide: 'ProviderAccountProfileRepository', useValue: repo('provider_account_profiles') },
        { provide: 'ProviderAuditLogRepository', useValue: repo('provider_audit_logs') },
        { provide: 'ProviderSessionRepository', useValue: repo('provider_sessions') },
        { provide: ProviderOtpService, useValue: { issue: async () => ({ sent: true }), verify: async () => ({ ok: true }), check: async () => ({ ok: true }) } },
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

  /** Approved provider whose account carries a DIFFERENT (stale) hash than users. */
  async function seedProvider(id: string, email: string, userPw: string, staleAccountPw: string, extra: any = {}) {
    await db.collection('users').insertOne({ id, email, role: 'doctor', active: true, token_version: 0, password_hash: await bcrypt.hash(userPw, 4) });
    await db.collection('provider_accounts').insertOne({ id, user_id: id, email, provider_type: 'doctor', status: 'approved', token_version: 0, failed_login_attempts: 0, password_hash: await bcrypt.hash(staleAccountPw, 4), ...extra });
  }

  it('login verifies the users hash; the stale provider_accounts hash is rejected', async () => {
    await seedProvider('prov-1', 'p1@example.test', 'UserPass1', 'StaleProv1');
    const ok = await providerLogin('p1@example.test', 'UserPass1');
    expect([200, 201]).toContain(ok.status);
    expect(ok.body.access_token).toBeTruthy();
    await providerLogin('p1@example.test', 'StaleProv1').expect(401);
  });

  it('patient-side change-password → new password works on provider login, old fails', async () => {
    const u: any = await db.collection('users').findOne({ id: 'prov-1' }).lean();
    const { accessToken } = auth.signToken(u, 'phone');
    const r = await http().post('/api/v1/users/me/change-password').set('Authorization', `Bearer ${accessToken}`)
      .send({ current_password: 'UserPass1', new_password: 'Changed22' });
    expect([200, 201]).toContain(r.status);
    await providerLogin('p1@example.test', 'UserPass1').expect(401);
    const ok = await providerLogin('p1@example.test', 'Changed22');
    expect([200, 201]).toContain(ok.status);
  });

  it('provider change-password writes users only, rotates sessions, both logins use the new password', async () => {
    const login = await providerLogin('p1@example.test', 'Changed22');
    const accountHashBefore = await hashOf('provider_accounts', 'prov-1');
    const r = await http().post('/api/v1/provider/auth/change-password')
      .set('Authorization', `Bearer ${login.body.access_token}`).set('x-device-id', 'tablet-1')
      .send({ current_password: 'Changed22', new_password: 'Provider33' });
    expect([200, 201]).toContain(r.status);
    expect(r.body.access_token).toBeTruthy();
    expect(r.body.session_id).toBeTruthy();
    expect(await hashOf('provider_accounts', 'prov-1')).toBe(accountHashBefore);
    expect(await bcrypt.compare('Provider33', await hashOf('users', 'prov-1'))).toBe(true);
    // Old provider access token and old provider refresh session are dead.
    await http().get('/api/v1/provider/auth/me').set('Authorization', `Bearer ${login.body.access_token}`).expect(401);
    const oldSession: any = await db.collection('provider_sessions').findOne({ id: login.body.session_id }).lean();
    expect(oldSession.status).toBe('revoked');
    // The fresh token works; patient login uses the same new password.
    await http().get('/api/v1/provider/auth/me').set('Authorization', `Bearer ${r.body.access_token}`).expect(200);
    await providerLogin('p1@example.test', 'Changed22').expect(401);
    const patient = await http().post('/api/v1/auth/login').send({ identifier: 'p1@example.test', password: 'Provider33' });
    expect([200, 201]).toContain(patient.status);
  });

  it('provider change-password with a wrong current password → 401, nothing written', async () => {
    const login = await providerLogin('p1@example.test', 'Provider33');
    const before = await hashOf('users', 'prov-1');
    await http().post('/api/v1/provider/auth/change-password').set('Authorization', `Bearer ${login.body.access_token}`)
      .send({ current_password: 'wrong-one1', new_password: 'Another44' }).expect(401);
    expect(await hashOf('users', 'prov-1')).toBe(before);
  });

  it('provider reset-password writes users only; new password works on both logins', async () => {
    await seedProvider('prov-2', 'p2@example.test', 'UserPass1', 'StaleProv1');
    const accountHashBefore = await hashOf('provider_accounts', 'prov-2');
    const r = await http().post('/api/v1/provider/auth/reset-password').send({ email: 'p2@example.test', code: '123456', new_password: 'Reset555a' });
    expect([200, 201]).toContain(r.status);
    expect(await hashOf('provider_accounts', 'prov-2')).toBe(accountHashBefore);
    await providerLogin('p2@example.test', 'UserPass1').expect(401);
    const ok = await providerLogin('p2@example.test', 'Reset555a');
    expect([200, 201]).toContain(ok.status);
    const patient = await http().post('/api/v1/auth/login').send({ identifier: 'p2@example.test', password: 'Reset555a' });
    expect([200, 201]).toContain(patient.status);
  });

  it('unlinked account (no users row) cannot log in with its own hash', async () => {
    await db.collection('provider_accounts').insertOne({ id: 'acc-orphan', email: 'orphan@example.test', provider_type: 'doctor', status: 'approved', failed_login_attempts: 0, password_hash: await bcrypt.hash('Orphan123', 4) });
    await providerLogin('orphan@example.test', 'Orphan123').expect(401);
  });

  it('hospital-style account (random id, linked by user_id) logs in with the users hash', async () => {
    await db.collection('users').insertOne({ id: 'u-staff', email: 'staff@example.test', role: 'doctor', active: true, password_hash: await bcrypt.hash('StaffPass1', 4) });
    await db.collection('provider_accounts').insertOne({ id: 'acc-staff', user_id: 'u-staff', email: 'staff@example.test', provider_type: 'doctor', status: 'approved', failed_login_attempts: 0 });
    const ok = await providerLogin('staff@example.test', 'StaffPass1');
    expect([200, 201]).toContain(ok.status);
  });

  it('legacy /provider/auth/register creates the linked users row holding the credential', async () => {
    const r = await http().post('/api/v1/provider/auth/register').send({ email: 'New@Example.test', password: 'Fresh123a', confirm_password: 'Fresh123a', provider_type: 'doctor' });
    expect([200, 201]).toContain(r.status);
    const acc: any = await db.collection('provider_accounts').findOne({ email: 'new@example.test' }).lean();
    expect(acc.user_id).toBe(acc.id);
    expect(acc.password_hash).toBeUndefined();
    const user: any = await db.collection('users').findOne({ id: acc.id }).lean();
    expect(user.onboarding_only).toBe(true);
    expect(await bcrypt.compare('Fresh123a', user.password_hash)).toBe(true);
  });
});
