/**
 * Gate 16.6 journey: a forced 500 shows only the error id, and the id finds the real error in the log.
 * REAL pieces over HTTP: CorrelationMiddleware, the global SentryExceptionFilter (as main.ts installs it), LoggerService.
 */
import { Controller, Get, HttpException, INestApplication, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CorrelationMiddleware } from '../../src/common/correlation.middleware';
import { MetricsService } from '../../src/common/metrics.service';
import { LoggerService } from '../../src/common/logger.service';
import { SentryExceptionFilter } from '../../src/common/sentry.filter';
import { setLogOutput } from '../../src/common/structured-logger';

jest.setTimeout(60_000);

@Controller('boom')
class BoomController {
  @Get('plain') plain() { throw new Error('E11000 duplicate key { phone: "+966501234567", email: "ali@example.sa" } at /app/dist/x.js:1:1'); }
  @Get('http') http() { throw new HttpException({ statusCode: 502, code: 'UPSTREAM_FAILED', message: 'gateway 10.0.0.9 refused' }, 502); }
}

@Module({ controllers: [BoomController], providers: [LoggerService, { provide: MetricsService, useValue: new MetricsService() }] })
class JourneyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) { consumer.apply(CorrelationMiddleware).forRoutes('*'); }
}

describe('Gate 16.6 journey: a forced 500 shows only the error id', () => {
  let app: INestApplication;
  const stdout: string[] = [];
  const env = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    setLogOutput((l) => stdout.push(l));
    const moduleRef = await Test.createTestingModule({ imports: [JourneyModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useLogger(app.get(LoggerService));
    app.useGlobalFilters(new SentryExceptionFilter(app.get(HttpAdapterHost).httpAdapter));
    await app.init();
  });
  afterAll(async () => { setLogOutput(); process.env.NODE_ENV = env; await app?.close(); });

  it('an unexpected error: generic message, the error id equals the X-Correlation-ID, no detail', async () => {
    const res = await request(app.getHttpServer()).get('/boom/plain').set('x-correlation-id', 'forced-500-0001');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ statusCode: 500, code: 'INTERNAL_ERROR', message: 'Internal server error', error_id: 'forced-500-0001' });
    expect(res.headers['x-correlation-id']).toBe('forced-500-0001');
    expect(res.text).not.toMatch(/E11000|966|ali@|dist\/x\.js|stack/i);
  });

  it('a deliberate 5xx keeps its code only', async () => {
    const res = await request(app.getHttpServer()).get('/boom/http').set('x-correlation-id', 'forced-502-0001');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ statusCode: 502, code: 'UPSTREAM_FAILED', message: 'Internal server error', error_id: 'forced-502-0001' });
    expect(res.text).not.toContain('10.0.0.9');
  });

  it('the log holds the real error under that id, masked, and no line leaks the phone or e-mail', () => {
    const rec = stdout.map((l) => { try { return JSON.parse(l); } catch { return null; } }).find((r) => r && r.event === 'exception' && r.request_id === 'forced-500-0001');
    expect(rec).toMatchObject({ level: 'error', status: 500, module: 'http' });
    expect(rec.details.error_id).toBe('forced-500-0001');
    expect(stdout.join('\n')).not.toMatch(/966501234567|ali@example/);
  });
});
