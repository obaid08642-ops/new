import { SeoSearchController } from './seo-search.module';

async function llms(count: number): Promise<string> {
  let body = '';
  const res: any = { setHeader: () => undefined, send: (b: string) => { body = b; } };
  const ctrl = new SeoSearchController({ catalogCount: async () => count } as any);
  await ctrl.llmsTxt(res);
  return body;
}

describe('F23 / Gate P4: llms.txt product count is real', () => {
  it('shows the live count when the catalog has products', async () => {
    expect(await llms(21052)).toContain('صيدلية إلكترونية (21,052 منتجاً)');
  });
  it('makes no count claim on an empty catalog (no invented "thousands of products")', async () => {
    const txt = await llms(0);
    expect(txt).not.toContain('آلاف المنتجات');
    expect(txt).toContain('> صيدلية إلكترونية + استشارات');
  });
});
