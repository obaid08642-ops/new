import { SeoSearchService } from './seo-search.module';

// Q17: the conditions sitemap emitted /condition/undefined for every condition (records carry `code`, not slug/id).
describe('SeoSearchService.publicConditionSitemap', () => {
  const svcWith = (rows: any[]) => new SeoSearchService({
    collection: () => ({ find: () => ({ limit: () => ({ toArray: async () => rows }) }) }),
  } as any);

  it('uses the condition code as the slug and drops records without any key', async () => {
    const out = await svcWith([
      { code: 'headache', updatedAt: new Date('2026-10-01T10:00:00Z') },
      { slug: 'flu' },
      { id: 'c-3' },
      {},
    ]).publicConditionSitemap();
    expect(out.map((x) => x.slug)).toEqual(['headache', 'flu', 'c-3']);
    expect(out[0].lastmod).toBe('2026-10-01');
    expect(out.some((x) => !x.slug || x.slug === 'undefined')).toBe(false);
  });
});
