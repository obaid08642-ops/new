/**
 * Gate 20.3 journey: a request fails on the server, and an admin finds the error in /admin/logs by its request id.
 *
 * REAL pieces over HTTP: CorrelationMiddleware (request id), JwtAuthGuard + RequirePermissions (SYSTEM_LOGS_VIEW), the
 * LoggerService installed with app.useLogger (so Nest's own "Exception" line goes through it), the LogsStoreService sink
 * (warn/error -> app_logs) and the AdminLogsController. Only the database is faked (an in-memory app_logs).
 *   1. GET /boom with a known x-correlation-id answers 500 (a test-only controller throws, with a phone number in the message)
 *   2. GET /admin/logs?request_id=...&level=error  finds the stored lines of that request
 *   3. GET /admin/logs/request/:id  returns every stored line of the request, in order, with the account id and no phone
 *   4. a role without system.logs.view gets 403; nothing but GET exists
 */
import { Controller, Get, INestApplication, MiddlewareConsumer, Module, NestModule, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest';
import { JwtAuthGuard } from '../../src/common/auth.guard';
import { ImpersonationSessionService } from '../../src/common/impersonation-session.service';
import { CorrelationMiddleware } from '../../src/common/correlation.middleware';
import { MetricsService } from '../../src/common/metrics.service';
import { LoggerService } from '../../src/common/logger.service';
import { setLogOutput } from '../../src/common/structured-logger';
import { AdminLogsController } from '../../src/modules/logs/admin-logs.controller';
import { LogsStoreService } from '../../src/modules/logs/app-logs.store';
import { TEST_JWT_SECRET, tokenFor } from '../security/harness';
import { FakeLogCollection } from '../support/fake-log-collection';

jest.setTimeout(120_000);

const KNOWN_ID = 'journey-known-error-0001';
const DEVICE = 'journey-logs-device-0001';

@Controller('boom')
class BoomController {
  @Get()
  boom() {
    throw new Error('lookup failed for +966501234567');
  }
}

const col = new FakeLogCollection();
const conn = {
  collection: (name: string) => (name === 'app_logs' ? col : { findOne: async () => (name === 'admin_devices' ? { device_hash: 'enrolled', revoked: false } : null), insertOne: async () => ({}) }),
  db: { command: async () => ({ size: 0, count: 0 }) },
  model: () => null,
};

@Module({
  controllers: [AdminLogsController, BoomController],
  providers: [
    LoggerService,
    LogsStoreService,
    { provide: MetricsService, useValue: new MetricsService() },
    { provide: JwtService, useValue: new JwtService({ secret: TEST_JWT_SECRET }) },
    Reflector,
    { provide: getConnectionToken(), useValue: conn },
    { provide: ImpersonationSessionService, useValue: {} },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
class JourneyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) { consumer.apply(CorrelationMiddleware).forRoutes('*'); }
}

describe('Gate 20.3 journey: a known error is found in /admin/logs by request id', () => {
  let app: INestApplication;
  let store: LogsStoreService;
  const stdout: string[] = [];
  // Owner decision 29: the built-in admin role grants nothing; the owner (super_admin) holds every permission.
  const admin = tokenFor('owner-1', 'super_admin');
  const get = (url: string, token = admin) => request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`).set('x-admin-device', DEVICE);

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    process.env.NODE_ENV = 'test';
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_STORE;
    setLogOutput((l) => stdout.push(l));
    const moduleRef = await Test.createTestingModule({ imports: [JourneyModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useLogger(app.get(LoggerService));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));   // as main.ts
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
    store = app.get(LogsStoreService);
  });
  afterAll(async () => { setLogOutput(); await app?.close(); });

  it('the failing request answers 500 and echoes the request id', async () => {
    const res = await get('/api/v1/boom').set('x-correlation-id', KNOWN_ID);
    expect(res.status).toBe(500);
    expect(res.headers['x-correlation-id']).toBe(KNOWN_ID);
    await store.flush();
  });

  it('an unsafe x-correlation-id is replaced, not stored', async () => {
    const res = await get('/api/v1/boom').set('x-correlation-id', 'bad id with spaces and "quotes"');
    expect(res.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/);
    await store.flush();
  });

  it('the error is in /admin/logs, filtered by request id and level', async () => {
    const res = await get(`/api/v1/admin/logs?request_id=${KNOWN_ID}&level=error`);
    expect(res.status).toBe(200);
    expect(res.body.retention_days).toBe(30);
    const events = res.body.data.map((r: any) => r.event);
    expect(events).toContain('http_request');
    expect(events).toContain('exception');   // Nest's own error line for the thrown Error, through the LoggerService
    const http = res.body.data.find((r: any) => r.event === 'http_request');
    expect(http).toMatchObject({ level: 'error', status: 500, request_id: KNOWN_ID, user_id: 'owner-1', service: 'backend', module: 'http' });
    expect(typeof http.duration_ms).toBe('number');
    expect(res.body.data.every((r: any) => r.request_id === KNOWN_ID)).toBe(true);
  });

  it('/admin/logs/request/:id returns every stored line of the request, oldest first, with no phone number', async () => {
    const res = await get(`/api/v1/admin/logs/request/${KNOWN_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
    const times = res.body.data.map((r: any) => Date.parse(r.ts));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(JSON.stringify(res.body)).not.toContain('966501234567');
    expect(JSON.stringify(col.docs)).not.toContain('966501234567');
    expect(stdout.join('\n')).not.toContain('966501234567');
    // the other (unsafe-id) request is a different request
    expect(res.body.data.every((r: any) => r.request_id === KNOWN_ID)).toBe(true);
  });

  it('text search finds it, and a search that matches nothing is empty', async () => {
    const hit = await get(`/api/v1/admin/logs?q=http_request&from=${new Date(Date.now() - 3600_000).toISOString()}&to=${new Date(Date.now() + 3600_000).toISOString()}`);
    expect(hit.body.total).toBeGreaterThan(0);
    const miss = await get('/api/v1/admin/logs?q=no-such-event-anywhere');
    expect(miss.body.total).toBe(0);
  });

  it('stdout carries the same lines as JSON, with the request id', () => {
    const mine = stdout.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((r) => r && r.request_id === KNOWN_ID);
    expect(mine.length).toBeGreaterThanOrEqual(2);
    for (const r of mine) expect(Object.keys(r)).toEqual(expect.arrayContaining(['ts', 'level', 'service', 'module', 'event', 'request_id', 'user_id', 'route', 'status', 'duration_ms', 'details']));
  });

  it('is read-only and permission-gated', async () => {
    expect((await get('/api/v1/admin/logs', tokenFor('p-1', 'patient'))).status).toBe(403);
    expect((await get('/api/v1/admin/logs', tokenFor('s-1', 'support_agent'))).status).toBe(403);
    expect((await get('/api/v1/admin/logs', tokenFor('a-1', 'admin'))).status).toBe(403); // an admin with no custom role
    expect((await request(app.getHttpServer()).get('/api/v1/admin/logs')).status).toBe(401);
    for (const method of ['post', 'put', 'patch', 'delete'] as const) {
      const r = await (request(app.getHttpServer()) as any)[method]('/api/v1/admin/logs').set('Authorization', `Bearer ${admin}`).set('x-admin-device', DEVICE).send({});
      expect(r.status).toBe(404);
    }
    expect((await get('/api/v1/admin/logs?level=info')).status).toBe(400);
    expect((await get('/api/v1/admin/logs?page_size=1000')).status).toBe(400);
    expect((await get('/api/v1/admin/logs/request/bad%20id')).status).toBe(400);
  });
});
