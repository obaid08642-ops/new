// 5d1528c (review round 2): errors raised before the route-cache interceptor
// runs (guard 401/403, unmatched-route 404) carried no Cache-Control, and
// nginx caches 404s. The global exception filter now marks every error
// response `private, no-store`.
import { CanActivate, Controller, Get, INestApplication, Injectable, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SentryExceptionFilter } from './sentry.filter';

@Injectable()
class DenyGuard implements CanActivate {
  canActivate(): boolean { throw new UnauthorizedException(); }
}

@Controller('probe')
class ProbeController {
  @UseGuards(DenyGuard) @Get('guarded') guarded() { return { ok: true }; }
  @Get('boom') boom() { throw new Error('unexpected'); }
}

describe('every error response is private, no-store', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ controllers: [ProbeController], providers: [DenyGuard] }).compile();
    app = mod.createNestApplication({ logger: false });
    app.useGlobalFilters(new SentryExceptionFilter(app.getHttpAdapter()));
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('a guard 401', async () => {
    const res = await request(app.getHttpServer()).get('/probe/guarded').expect(401);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('an unknown route 404', async () => {
    const res = await request(app.getHttpServer()).get('/nothing/here').expect(404);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('an unexpected 500', async () => {
    const res = await request(app.getHttpServer()).get('/probe/boom').expect(500);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });
});
