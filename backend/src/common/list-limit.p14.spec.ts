import { Controller, Get, INestApplication, Query } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { capListLimits, LIST_LIMIT_CEILING, listLimitMiddleware } from './list-limit.middleware';

/** P14.25: no list endpoint can be asked for an unbounded page. */
describe('list limit ceiling (P14.25)', () => {
  it('caps oversized page sizes and leaves everything else alone', () => {
    expect(capListLimits('/api/v1/x?limit=1000000&q=a')).toBe(`/api/v1/x?limit=${LIST_LIMIT_CEILING}&q=a`);
    expect(capListLimits('/api/v1/x?per_page=5000')).toBe(`/api/v1/x?per_page=${LIST_LIMIT_CEILING}`);
    expect(capListLimits('/api/v1/x?limit=50&page=900000')).toBe('/api/v1/x?limit=50&page=900000');
    expect(capListLimits('/api/v1/x?limit=abc')).toBe('/api/v1/x?limit=abc');
    expect(capListLimits('/api/v1/x')).toBe('/api/v1/x');
    expect(capListLimits('/api/v1/x?limit=1e9')).toBe(`/api/v1/x?limit=${LIST_LIMIT_CEILING}`);
  });

  it('a route reading @Query("limit") sees the capped value', async () => {
    @Controller('probe')
    class Probe {
      @Get() list(@Query('limit') limit?: string) { return { limit }; }
    }
    const mod = await Test.createTestingModule({ controllers: [Probe] }).compile();
    const app: INestApplication = mod.createNestApplication();
    app.use(listLimitMiddleware);
    await app.init();
    const res = await request(app.getHttpServer()).get('/probe?limit=99999999');
    expect(res.body).toEqual({ limit: String(LIST_LIMIT_CEILING) });
    const ok = await request(app.getHttpServer()).get('/probe?limit=20');
    expect(ok.body).toEqual({ limit: '20' });
    await app.close();
  });
});
