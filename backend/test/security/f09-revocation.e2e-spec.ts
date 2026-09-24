/** F09: token_version session revocation — stale tokens 401, public degrades to anon. */
import { Controller, Get, INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { JwtAuthGuard, Public } from '../../src/common/auth.guard';
import { WriteGuard } from '../../src/common/write-guard';
import { ImpersonationSessionService } from '../../src/common/impersonation-session.service';
import { TEST_JWT_SECRET, signToken } from './harness';
import request from 'supertest';

@Controller('revprobe')
class RevProbeController {
  @Get('private') priv() { return { ok: true }; }
  @Public() @Get('open') open() { return { ok: true }; }
}

describe('F09 session revocation via token_version', () => {
  let app: INestApplication;
  const users: Record<string, any> = {
    'patient-1': { token_version: 1 },
    'fresh-1': { token_version: 2 },
    // P2.1 linked identity: provider account shares the user's id.
    'linked-1': { token_version: 1 },
    'linked-2': { token_version: 1 },
  };
  const accounts: Record<string, any> = {
    'prov-1': { token_version: 5, status: 'approved' },
    // Suspended after linking: provider counter bumped 1 → 2, users stays 1.
    'linked-1': { token_version: 2, status: 'suspended' },
    // Provider password reset bumped provider counter 1 → 3; users stays 1.
    'linked-2': { token_version: 3, status: 'approved' },
  };
  const conn = {
    collection: (name: string) => ({
      findOne: async (q: any) => {
        if (name === 'users') return users[q?.id] || null;
        if (name === 'provider_accounts') {
          const id = q?.id || q?.$or?.[0]?.id;
          return accounts[id] || null;
        }
        return null;
      },
    }),
    model: () => null,
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    const moduleRef = await Test.createTestingModule({
      controllers: [RevProbeController],
      providers: [
        { provide: JwtService, useValue: new JwtService({ secret: TEST_JWT_SECRET }) },
        Reflector,
        { provide: getConnectionToken(), useValue: conn },
        { provide: ImpersonationSessionService, useValue: {} },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: WriteGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  const srv = () => request(app.getHttpServer());

  it('banned user (tv bumped to 1, old token tv 0) → 401', async () => {
    await srv().get('/api/v1/revprobe/private')
      .set('Authorization', `Bearer ${signToken({ id: 'patient-1', role: 'patient', tv: 0 })}`)
      .expect(401);
  });

  it('fresh token with matching tv → 200', async () => {
    await srv().get('/api/v1/revprobe/private')
      .set('Authorization', `Bearer ${signToken({ id: 'fresh-1', role: 'patient', tv: 2 })}`)
      .expect(200);
  });

  it('unknown subject (service token, nothing to revoke) → 200', async () => {
    await srv().get('/api/v1/revprobe/private')
      .set('Authorization', `Bearer ${signToken({ id: 'svc-internal', role: 'system' })}`)
      .expect(200);
  });

  it('stale token on a public route degrades to anonymous → 200', async () => {
    await srv().get('/api/v1/revprobe/open')
      .set('Authorization', `Bearer ${signToken({ id: 'patient-1', role: 'patient', tv: 0 })}`)
      .expect(200);
  });

  it('provider account with matching tv → 200', async () => {
    await srv().get('/api/v1/revprobe/private')
      .set('Authorization', `Bearer ${signToken({ id: 'prov-1', role: 'provider', scope: 'provider', tv: 5 })}`)
      .expect(200);
  });

  it('provider account with stale tv → 401', async () => {
    await srv().get('/api/v1/revprobe/private')
      .set('Authorization', `Bearer ${signToken({ id: 'prov-1', role: 'provider', scope: 'provider', tv: 4 })}`)
      .expect(401);
  });

  it('linked provider: suspend bumps provider_accounts only → old provider token 401 (not checked against users)', async () => {
    await srv().get('/api/v1/revprobe/private')
      .set('Authorization', `Bearer ${signToken({ id: 'linked-1', role: 'provider', scope: 'provider', tv: 1 })}`)
      .expect(401);
  });

  it('linked provider after password reset: token signed from provider_accounts.tv → 200 though users.tv differs', async () => {
    await srv().get('/api/v1/revprobe/private')
      .set('Authorization', `Bearer ${signToken({ id: 'linked-2', role: 'provider', scope: 'provider', tv: 3 })}`)
      .expect(200);
  });

  it('linked user: patient-scope token is checked against users.tv', async () => {
    await srv().get('/api/v1/revprobe/private')
      .set('Authorization', `Bearer ${signToken({ id: 'linked-1', role: 'patient', tv: 1 })}`)
      .expect(200);
  });
});
