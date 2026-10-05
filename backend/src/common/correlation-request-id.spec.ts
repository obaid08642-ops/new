// 909fed4: request-id.middleware.ts and structured-logger.ts had no callers.
// Live, `x-request-id` was not echoed (only x-correlation-id) and the access
// log was a free-text line. CorrelationMiddleware (the one wired for every
// route in app.module.ts) now owns the request id: it accepts a safe incoming
// x-request-id (or x-correlation-id), echoes it on both headers, and writes
// the access log as one JSON record carrying that id.
import { Controller, Get, INestApplication, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CorrelationMiddleware } from './correlation.middleware';

@Controller('probe')
class ProbeController {
  @Get() ok() { return { ok: true }; }
}

@Module({ controllers: [ProbeController] })
class ProbeModule implements NestModule {
  configure(consumer: MiddlewareConsumer) { consumer.apply(CorrelationMiddleware).forRoutes('*'); }
}

describe('request id on every response and access-log line (909fed4)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    app = mod.createNestApplication({ logger: false });
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  const logged = async (run: () => Promise<request.Response>) => {
    const lines: string[] = [];
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => { lines.push(String(chunk)); return true; });
    try {
      const res = await run();
      await new Promise((r) => setImmediate(r));
      const records = lines.flatMap((l) => l.split('\n')).filter((l) => l.startsWith('{')).map((l) => JSON.parse(l) as Record<string, unknown>);
      return { res, records };
    } finally { spy.mockRestore(); }
  };

  it('echoes a safe incoming x-request-id and logs it as JSON', async () => {
    const { res, records } = await logged(() => request(app.getHttpServer()).get('/probe?token=secret').set('x-request-id', 'g2-probe-123'));
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe('g2-probe-123');
    expect(res.headers['x-correlation-id']).toBe('g2-probe-123');
    const access = records.find((r) => r.module === 'http');
    expect(access).toMatchObject({ level: 'info', requestId: 'g2-probe-123', data: { method: 'GET', path: '/probe', status: 200 } });
    expect(JSON.stringify(access)).not.toContain('secret');
  });

  it('replaces an unsafe id with a generated uuid on both headers', async () => {
    const res = await request(app.getHttpServer()).get('/probe').set('x-request-id', 'has spaces');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers['x-correlation-id']).toBe(res.headers['x-request-id']);
  });
});
