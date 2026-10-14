import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { MetricsService } from '../../common/metrics.service';
import { JwtAuthGuard } from '../../common/auth.guard';
import { ObservabilityController } from './observability.controller';

/** The scrape surface maps the API (routes, error rates, latency): only Prometheus with the scrape token reads it. */
describe('metrics scrape token', () => {
  const TOKEN = 'x'.repeat(40);
  let app: INestApplication;
  const prev = process.env.METRICS_SCRAPE_TOKEN;

  beforeAll(async () => {
    // the admin-only `slos` route's JWT guard is not what is tested here
    const mod = await Test.createTestingModule({ controllers: [ObservabilityController], providers: [MetricsService] })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    process.env.METRICS_SCRAPE_TOKEN = prev;
    await app.close();
  });

  it.each(['/observability/metrics', '/observability/summary'])('%s: 404 without a configured token, even with a bearer', async (path) => {
    delete process.env.METRICS_SCRAPE_TOKEN;
    await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${TOKEN}`).expect(404);
  });

  it.each(['/observability/metrics', '/observability/summary'])('%s: 404 with no token or a wrong one', async (path) => {
    process.env.METRICS_SCRAPE_TOKEN = TOKEN;
    await request(app.getHttpServer()).get(path).expect(404);
    await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${'y'.repeat(40)}`).expect(404);
    await request(app.getHttpServer()).get(path).set('Authorization', TOKEN).expect(404);
  });

  it('a short configured token is refused (no weak scrape secret)', async () => {
    process.env.METRICS_SCRAPE_TOKEN = 'short';
    await request(app.getHttpServer()).get('/observability/metrics').set('Authorization', 'Bearer short').expect(404);
  });

  it('Prometheus with the token reads the exposition', async () => {
    process.env.METRICS_SCRAPE_TOKEN = TOKEN;
    const res = await request(app.getHttpServer()).get('/observability/metrics').set('Authorization', `Bearer ${TOKEN}`).expect(200);
    expect(res.headers['content-type']).toContain('text/plain');
    const sum = await request(app.getHttpServer()).get('/observability/summary').set('Authorization', `Bearer ${TOKEN}`).expect(200);
    expect(sum.body).toHaveProperty('requests');
  });

  it('the uptime check stays public: one boolean and the overall ratio', async () => {
    const res = await request(app.getHttpServer()).get('/observability/health-slo').expect(200);
    expect(Object.keys(res.body).sort()).toEqual(['error_ratio', 'ok', 'requests', 'target']);
  });
});
