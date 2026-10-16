import { SeoController } from './seo.controller';

// P13-R12: a rename keeps the old slug as a 301 redirect, never breaking the
// canonical URL. The service-level history resolution is covered by
// seo-slug-history.spec.ts; this spec pins the HTTP contract of
// GET seo/resolve/:type/:slug (verified DONE on main — characterization, no
// production change in this PR).
describe('P13-R12 slug rename issues a 301 to canonical', () => {
  function controllerWith(entity: any) {
    const svc: any = { resolve: jest.fn(async () => entity) };
    const ctl = new SeoController(svc, {} as any);
    const headers: Record<string, string> = {};
    const res: any = {
      status: jest.fn((code: number) => ({ setHeader: jest.fn((k: string, v: string) => { headers[k] = v; }) })),
      statusCode: 200,
    };
    return { ctl, res, headers, svc };
  }

  it('a renamed slug answers 301 with the canonical Location', async () => {
    const { ctl, res, headers } = controllerWith({ id: 'd9', slug: 'new-slug', _moved_from: 'old-slug' });
    const out: any = await ctl.resolve('doctor', 'old-slug', res);
    expect(res.status).toHaveBeenCalledWith(301);
    expect(headers.Location).toBe('https://nabd.plus/ar/doctor/new-slug');
    expect(out).toMatchObject({ moved_from: 'old-slug', canonical_path: '/ar/doctor/new-slug' });
  });

  it('a current slug answers 200 with the entity and no redirect', async () => {
    const { ctl, res } = controllerWith({ id: 'd9', slug: 'new-slug' });
    const out: any = await ctl.resolve('doctor', 'new-slug', res);
    expect(res.status).not.toHaveBeenCalledWith(301);
    expect(out).toMatchObject({ id: 'd9' });
  });

  it('an unknown slug answers 404', async () => {
    const { ctl, res } = controllerWith(null);
    await expect(ctl.resolve('doctor', 'nope', res)).rejects.toThrow('Entity not found');
  });
});
