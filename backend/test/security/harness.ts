/**
 * Shared harness for P1.2 security e2e tests (F01–F08).
 *
 * Boots the REAL controller with the REAL production guards (JwtAuthGuard +
 * WriteGuard, in production order) over HTTP, with only the persistence-backed
 * service layer replaced by in-memory fakes that mirror the real ownership
 * semantics. Each test then asserts the security matrix:
 *   patient token        → 403
 *   correct role + own   → 2xx
 *   correct role + other → 403
 *
 * JWTs are real (signed with JwtService, verified by the real JwtAuthGuard).
 * Tokens carry no `scope`, so no DB lookups fire; the injected mongoose
 * connection is a stub returning null, except `admin_devices`: admin tokens
 * act from an enrolled device (C2), which has its own tests.
 */
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../../src/common/auth.guard';
import { WriteGuard } from '../../src/common/write-guard';
import { RedisCacheInterceptor } from '../../src/common/redis-cache.interceptor';
import { ImpersonationSessionService } from '../../src/common/impersonation-session.service';
import request from 'supertest';

// Nest app boots (module compile + DI graph) routinely take 20–40s on CI;
// the default 5s hook timeout flakes full-directory runs. Set per-file.
jest.setTimeout(120_000);

export const TEST_JWT_SECRET = 'p1-security-test-secret';

export function signToken(payload: Record<string, unknown>): string {
  return new JwtService({ secret: TEST_JWT_SECRET }).sign(payload);
}

export const patientToken = () => signToken({ id: 'patient-1', role: 'patient' });
export const tokenFor = (id: string, role: string) => signToken({ id, role });

const connectionStub = {
  collection: (name: string) => ({
    findOne: async () => (name === 'admin_devices' ? { device_hash: 'enrolled', revoked: false } : null),
    insertOne: async () => ({}),
  }),
  model: () => null,
};

export async function buildSecurityApp(
  controllers: any[],
  providers: any[],
): Promise<INestApplication> {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  const moduleRef = await Test.createTestingModule({
    controllers,
    providers: [
      ...providers,
      { provide: JwtService, useValue: new JwtService({ secret: TEST_JWT_SECRET }) },
      Reflector,
      { provide: getConnectionToken(), useValue: connectionStub },
      { provide: ImpersonationSessionService, useValue: {} },
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      { provide: APP_GUARD, useClass: WriteGuard },
    ],
  })
    // Cache interceptors are transport concerns, not access control: pass through.
    .overrideInterceptor(RedisCacheInterceptor)
    .useValue({ intercept: (_ctx: any, next: any) => next.handle() })
    .compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  await app.init();
  return app;
}

// C2: every admin call carries the browser's device id (the BFF sends it from the admin_device cookie).
export const ADMIN_DEVICE = 'security-harness-device-0001';
const withAuth = (r: request.Test, token?: string) =>
  token ? r.set('Authorization', `Bearer ${token}`).set('x-admin-device', ADMIN_DEVICE) : r;

export const post = (app: INestApplication, url: string, token?: string, body: any = {}) => {
  return withAuth(request(app.getHttpServer()).post(url).send(body), token);
};

export const put = (app: INestApplication, url: string, token?: string, body: any = {}) => {
  return withAuth(request(app.getHttpServer()).put(url).send(body), token);
};
