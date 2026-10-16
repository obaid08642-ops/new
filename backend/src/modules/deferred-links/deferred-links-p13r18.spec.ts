import { DeferredLinksService } from './deferred-links.module';

// P13-R18: nabd:// fallback and deferred deep links (install → open the
// originally requested entity). Red on the base: no deferred-link records,
// no create/resolve endpoints — only incidental nabd:// strings exist.
describe('P13-R18 deferred deep links', () => {
  function setup(opts: { proj?: any; sources?: Record<string, any>; createdToday?: number } = {}) {
    const links: any[] = [];
    const proj = opts.proj === undefined
      ? { entity_type: 'medicine', entity_id: 'med-1', published: true, indexable: true }
      : opts.proj;
    const sources = opts.sources === undefined
      ? { 'medicines:med-1': { id: 'med-1', slug: 'panadol-abcdef' } }
      : opts.sources;
    const col = (name: string) => {
      if (name === 'public_catalog_projections') {
        return { findOne: jest.fn(async () => proj) };
      }
      if (name === 'medicines' || name === 'provider_profiles' || name === 'facilities' || name === 'articles') {
        return {
          findOne: jest.fn(async (q: any) => {
            const ors: any[] = Array.isArray(q?.$or) ? q.$or : [q];
            const hit = Object.values(sources).find((d: any) => d && ors.some((c: any) =>
              (c.id !== undefined && d.id === c.id) || (c.slug !== undefined && d.slug === c.slug)));
            return hit || null;
          }),
        };
      }
      if (name === 'deferred_links') {
        return {
          insertOne: jest.fn(async (d: any) => { links.push(d); return { insertedId: d.id }; }),
          findOne: jest.fn(async (q: any) => links.find((l: any) => l.id === q?.id) || null),
          updateOne: jest.fn(async (f: any, u: any) => {
            const l = links.find((x: any) => x.id === f?.id);
            if (l) Object.assign(l, u?.$set || {}, { use_count: (l.use_count || 0) + (u?.$inc?.use_count || 0) });
            return { modifiedCount: l ? 1 : 0 };
          }),
          countDocuments: jest.fn(async () => opts.createdToday || 0),
        };
      }
      return { findOne: jest.fn(async () => null) };
    };
    const conn: any = { collection: jest.fn((n: string) => col(n)) };
    const svc = new DeferredLinksService(conn);
    return { svc, conn, links };
  }

  const USER = { id: 'u-1', role: 'patient' };

  it('creates a shareable deferred link for a published entity', async () => {
    const { svc } = setup();
    const out: any = await svc.create(USER as any, { entity_type: 'medicine', entity_ref: 'med-1' });
    expect(typeof out.id).toBe('string');
    expect(out.universal_url).toContain('https://nabd.plus/p/panadol-abcdef');
    expect(out.app_url).toContain('nabdplus://');
    expect(new Date(out.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('refuses links for unpublished entities', async () => {
    const { svc } = setup({
      proj: { entity_type: 'medicine', entity_id: 'med-9', published: false },
      sources: { 'medicines:med-9': { id: 'med-9', slug: 's-9' } },
    });
    await expect(svc.create(USER as any, { entity_type: 'medicine', entity_ref: 'med-9' })).rejects.toThrow('not_public');
  });

  it('resolves once, then the link is spent', async () => {
    const { svc } = setup();
    const made: any = await svc.create(USER as any, { entity_type: 'medicine', entity_ref: 'med-1' });
    const first: any = await svc.resolve(made.id);
    expect(first).toMatchObject({ entity_type: 'medicine', entity_id: 'med-1' });
    expect(first.web_path).toContain('/p/panadol-abcdef');
    await expect(svc.resolve(made.id)).rejects.toThrow('link_used');
  });

  it('an expired link stays dead', async () => {
    const { svc, links } = setup();
    const made: any = await svc.create(USER as any, { entity_type: 'medicine', entity_ref: 'med-1' });
    links[0].expires_at = new Date(Date.now() - 1000);
    await expect(svc.resolve(made.id)).rejects.toThrow('link_expired');
  });

  it('caps daily link creation per user', async () => {
    const { svc } = setup({ createdToday: 50 });
    await expect(svc.create(USER as any, { entity_type: 'medicine', entity_ref: 'med-1' })).rejects.toThrow('too_many_links');
  });
});
