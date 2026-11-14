import { AppVersionMiddleware } from './app-version.middleware';
import { isVersionBelow } from './app-version';
import { MetricsService } from './metrics.service';

const make = (apps: Record<string, any> | Error) => {
  const conn: any = { collection: () => ({ findOne: async () => { if (apps instanceof Error) throw apps; return { value: { apps } }; } }) };
  return new AppVersionMiddleware(conn);
};
const call = async (mw: AppVersionMiddleware, headers: Record<string, string>, url = '/api/v1/orders') => {
  const res: any = { statusCode: 0, body: undefined, status(c: number) { this.statusCode = c; return this; }, json(b: unknown) { this.body = b; return this; } };
  let nexted = false;
  await mw.use({ headers, originalUrl: url, url } as any, res, () => { nexted = true; });
  return { res, nexted };
};
const CFG = { patient: { min_version: '1.2.0', latest_version: '1.4.0', message_ar: 'حدّث التطبيق', message_en: 'Please update' }, provider: { min_version: '2.0.0' } };

describe('isVersionBelow', () => {
  it.each([['1.0.0', '1.2.0', true], ['1.2.0', '1.2.0', false], ['1.10.0', '1.9.0', false], ['1.2', '1.2.1', true], ['2', '1.9.9', false], ['abc', '1.0.0', false], ['1.0.0', 'x', false], ['1.0.0', undefined, false]])('%s vs min %s -> %s', (c, m, want) => {
    expect(isVersionBelow(c as string, m as string | undefined)).toBe(want);
  });
});

describe('AppVersionMiddleware', () => {
  it('answers 426 with the admin message when the build is below the minimum', async () => {
    const { res, nexted } = await call(make(CFG), { 'x-app-id': 'patient', 'x-app-version': '1.1.9' });
    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(426);
    expect(res.body).toMatchObject({ error: 'app_update_required', min_version: '1.2.0', latest_version: '1.4.0', message_ar: 'حدّث التطبيق', message_en: 'Please update' });
  });
  it('lets a current build through, and judges each app by its own minimum', async () => {
    expect((await call(make(CFG), { 'x-app-id': 'patient', 'x-app-version': '1.2.0' })).nexted).toBe(true);
    expect((await call(make(CFG), { 'x-app-id': 'provider', 'x-app-version': '1.9.0' })).res.statusCode).toBe(426);
    expect((await call(make(CFG), { 'x-app-id': 'driver', 'x-app-version': '0.1.0' })).nexted).toBe(true);   // no entry for driver
  });
  it('does not touch requests without the headers (older builds, web, scripts) or with an unknown app id', async () => {
    expect((await call(make(CFG), {})).nexted).toBe(true);
    expect((await call(make(CFG), { 'x-app-version': '0.0.1' })).nexted).toBe(true);
    expect((await call(make(CFG), { 'x-app-id': 'web', 'x-app-version': '0.0.1' })).nexted).toBe(true);
  });
  it('never blocks config, health or observability, so the app can still read the message and the platform can still be probed', async () => {
    for (const url of ['/api/v1/config', '/api/v1/health/liveness', '/api/v1/observability/metrics', '/config']) {
      expect((await call(make(CFG), { 'x-app-id': 'patient', 'x-app-version': '0.0.1' }, url)).nexted).toBe(true);
    }
    expect((await call(make(CFG), { 'x-app-id': 'patient', 'x-app-version': '0.0.1' }, '/api/v1/configuration-x')).res.statusCode).toBe(426);
  });
  it('fails open when the config store is down, and keeps using the last good copy', async () => {
    expect((await call(make(new Error('mongo down')), { 'x-app-id': 'patient', 'x-app-version': '0.0.1' })).nexted).toBe(true);
    let down = false;
    const conn: any = { collection: () => ({ findOne: async () => { if (down) throw new Error('down'); return { value: { apps: CFG } }; } }) };
    const mw = new AppVersionMiddleware(conn);
    expect((await call(mw, { 'x-app-id': 'patient', 'x-app-version': '1.0.0' })).res.statusCode).toBe(426);
    down = true; (mw as any).cache.at = 0;           // cache expired, store unavailable
    expect((await call(mw, { 'x-app-id': 'patient', 'x-app-version': '1.0.0' })).res.statusCode).toBe(426);
  });
  it('counts traffic per app and version for the deprecation decision, with a cap', async () => {
    const count = (v: string) => Number((new MetricsService().scrape().match(new RegExp(`nabd_client_requests_total\\{app="patient",version="${v}"\\} (\\d+)`)) ?? [])[1] ?? 0);   // the counter is process-wide
    const mw = make(CFG);
    const before = count('1\\.2\\.0'); const beforeOther = count('other');
    await call(mw, { 'x-app-id': 'patient', 'x-app-version': '1.2.0' }); await call(mw, { 'x-app-id': 'patient', 'x-app-version': '1.2.0' });
    await call(mw, { 'x-app-id': 'patient', 'x-app-version': '1.2.0; DROP' });
    expect(count('1\\.2\\.0')).toBe(before + 2);
    expect(count('other')).toBe(beforeOther + 1);
    for (let i = 0; i < 200; i++) await call(mw, { 'x-app-id': 'pharmacy', 'x-app-version': `9.${i}.0` });
    const series = new MetricsService().scrape().split('\n').filter((l) => l.startsWith('nabd_client_requests_total{')).length;
    expect(series).toBeLessThanOrEqual(60);
  });
});
