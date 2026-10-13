/**
 * Fuzz regression: `GET /public/categories/:locale/items` returned 500 for
 * `sub` / `category` carrying control characters (schemathesis found it:
 * `limit=%F4...&sub=%0Ff%0C...` → `{"statusCode":500}`).
 *
 * MongoDB rejects control bytes (NUL, C0/C1) inside a `$regex`. The `q` path
 * was already safe (it goes through `normalizeSearchText`), but `sub` and
 * `category` were regex-escaped for metacharacters yet kept the controls.
 * They are now stripped; a term that is only controls yields no clause instead
 * of a crash or a match-everything.
 *
 * The specs below drive `publicCategoryProducts` with the exact fuzz shapes
 * against a mocked collection that captures the filter, then asserts every
 * `$regex` in it is control-free (what Mongo requires) — without needing a
 * live mongod.
 */
import { SeoSearchService } from './seo-search.module';

function serviceWith(captured: { filter?: any }) {
  const collection = jest.fn(() => ({
    find: jest.fn((filter: any) => {
      captured.filter = filter;
      return {
        sort: jest.fn(() => ({
          skip: jest.fn(() => ({
            limit: jest.fn(() => ({ toArray: jest.fn(async () => []) })),
          })),
        })),
      };
    }),
    countDocuments: jest.fn(async () => 0),
  }));
  const conn: any = { collection };
  // SeoSearchService takes (conn, ...) — extra args are optional.
  const svc = new (SeoSearchService as any)(conn);
  return svc;
}

function regexesIn(node: any, out: string[] = []): string[] {
  if (typeof node === 'string') return out;
  if (node && typeof node === 'object') {
    if (typeof (node as any).$regex === 'string') out.push((node as any).$regex);
    for (const v of Object.values(node)) regexesIn(v, out);
  }
  return out;
}

const HAS_CONTROLS = /[\u0000-\u001F\u007F-\u009F]/;

describe('fuzz regression: control characters never reach a $regex', () => {
  it('sub with C0/C1 controls is stripped, not crashed', async () => {
    const captured: any = {};
    const svc = serviceWith(captured);
    // Exact fuzz shape: %0Ff%0C... decoded
    const sub = '\x0Ff\x0Cc\xb4\xf0\xb8\x9a\x88\xc2\xb0\xc2\xb2\xc2\xa6\xc2\x9f\xc3\xb1\x0c\x19\xf2\x9b\x9c\x89';
    await svc.publicCategoryProducts('ar', 'all', sub, 1, 24, undefined);
    expect(captured.filter).toBeDefined();
    for (const rx of regexesIn(captured.filter)) {
      expect(HAS_CONTROLS.test(rx)).toBe(false);
      // The source must compile — Mongo compiles it server-side.
      expect(() => new RegExp(rx)).not.toThrow();
    }
  });

  it('a sub of only controls yields no sub clause (instead of match-all or 500)', async () => {
    const captured: any = {};
    const svc = serviceWith(captured);
    await svc.publicCategoryProducts('ar', 'all', '\x00\x01\x02', 1, 24, undefined);
    expect(JSON.stringify(captured.filter)).not.toContain('sub_category');
  });

  it('category with controls is stripped before the canonical lookup', async () => {
    const captured: any = {};
    const svc = serviceWith(captured);
    await svc.publicCategoryProducts('ar', 'all\x00\x1f', undefined, 1, 24, undefined);
    for (const rx of regexesIn(captured.filter)) {
      expect(HAS_CONTROLS.test(rx)).toBe(false);
    }
  });

  it('q with controls still expands safely (normalizeSearchText path)', async () => {
    const captured: any = {};
    const svc = serviceWith(captured);
    await svc.publicCategoryProducts('ar', 'all', undefined, 1, 24, '\x98\x96\x00abc');
    for (const rx of regexesIn(captured.filter)) {
      expect(HAS_CONTROLS.test(rx)).toBe(false);
      expect(() => new RegExp(rx)).not.toThrow();
    }
  });

  it('normal text passes through untouched', async () => {
    const captured: any = {};
    const svc = serviceWith(captured);
    await svc.publicCategoryProducts('ar', 'vitamins', 'فيتامينات', 1, 24, 'بنادول');
    const flat = JSON.stringify(captured.filter);
    expect(flat).toContain('sub_category');
    expect(flat).toContain('بنادول');
  });
});
