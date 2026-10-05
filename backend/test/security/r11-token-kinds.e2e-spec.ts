/**
 * Round 11 §5 lead (reproduced live 2026-10-04): every token signed with
 * JWT_SECRET was accepted as an access token. A 14-day refresh token
 * ({sub, type:'refresh'}) read GET /notifications as the user and, carrying no
 * `tv`, survived a ban; a 5-minute health QR shown to a doctor worked the same.
 * Only access tokens (id + role, no refresh/qr/purpose marker) may authenticate.
 */
import { Controller, Get, INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { JwtAuthGuard, Public, CurrentUser } from '../../src/common/auth.guard';
import { ImpersonationSessionService } from '../../src/common/impersonation-session.service';
import { TEST_JWT_SECRET, signToken } from './harness';
import request from 'supertest';

@Controller('kindprobe')
class KindProbeController {
  @Get('me') me(@CurrentUser() u: { id?: string; sub?: string }) { return { who: u?.id || u?.sub }; }
  @Public() @Get('open') open(@CurrentUser() u: { id?: string }) { return { who: u?.id ?? null }; }
}

describe('only access tokens authenticate requests (R11 §5)', () => {
  let app: INestApplication;
  const conn = { collection: () => ({ findOne: async () => ({ token_version: 0, status: 'approved' }) }), model: () => null };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    const moduleRef = await Test.createTestingModule({
      controllers: [KindProbeController],
      providers: [
        { provide: JwtService, useValue: new JwtService({ secret: TEST_JWT_SECRET }) },
        Reflector,
        { provide: getConnectionToken(), useValue: conn },
        { provide: ImpersonationSessionService, useValue: {} },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  const get = (path: string, token: string) => request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`);

  it.each([
    ['refresh', { sub: 'pat-1', type: 'refresh', jti: 'j1' }],
    ['health passport QR', { sub: 'pat-1', scope: 'health_passport', type: 'qr' }],
    ['health id QR', { sub: 'pat-1', health_id: 'H1', purpose: 'health_id' }],
    ['chat realtime', { sub: 'pat-1', purpose: 'chat_rt', thread_id: 't1' }],
    ['role-less payload', { id: 'pat-1', patientId: 'pat-1', name: 'x' }],
  ])('a %s token is refused on a private route', async (_kind, payload) => {
    await get('/api/v1/kindprobe/me', signToken(payload as never)).expect(401);
  });

  it('the same token on a public route is treated as anonymous', async () => {
    const r = await get('/api/v1/kindprobe/open', signToken({ sub: 'pat-1', type: 'refresh', jti: 'j1' } as never)).expect(200);
    expect(r.body.who).toBeNull();
  });

  it.each([
    ['patient access', { sub: 'pat-1', id: 'pat-1', role: 'patient', tv: 0 }],
    ['provider access', { sub: 'prov-1', id: 'prov-1', role: 'provider', scope: 'provider', tv: 0 }],
  ])('a %s token still works', async (_kind, payload) => {
    const r = await get('/api/v1/kindprobe/me', signToken(payload as never)).expect(200);
    expect(r.body.who).toBe(payload.id);
  });
});
