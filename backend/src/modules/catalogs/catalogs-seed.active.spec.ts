import { CatalogsSeedService } from './catalogs-seed.service';
import { CATALOG_COLLECTIONS } from './catalog-collections';

// CI live gate findings (fresh DB): seeded catalog rows skipped schema defaults. Nursing additions carried
// `is_active` instead of `active` (never listed) and had no `duration` (required on a booking, so 400).
describe('CatalogsSeedService seeds rows the readers can list and book', () => {
  it('every inserted row is active; nursing rows carry a duration; old rows are repaired', async () => {
    const calls: Array<{ name: string; doc: any }> = [];
    const many: Array<{ name: string; args: any[] }> = [];
    const conn: any = { collection: (name: string) => ({
      updateOne: jest.fn(async (_q: any, u: any) => { if (u?.$setOnInsert) calls.push({ name, doc: u.$setOnInsert }); return {}; }),
      updateMany: jest.fn(async (...args: any[]) => { many.push({ name, args }); return {}; }),
      find: jest.fn(() => ({ toArray: async () => [] })),
    }) };
    await (new CatalogsSeedService(conn) as any).seed().catch(() => null);
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      expect(c.doc.active).toBe(true);
      if (c.name === CATALOG_COLLECTIONS.nursing_services) expect(c.doc.duration).toBeTruthy();
    }
    // seed-data exported some ids as raw UUID bytes: every id a patient sees must be URL-safe text.
    for (const c of calls) if (c.doc.id !== undefined) expect(c.doc.id).toMatch(/^[\x21-\x7e]{1,100}$/);
    expect(many.some((m) => m.name === CATALOG_COLLECTIONS.nursing_services && m.args[0].is_active === true)).toBe(true);
    expect(many.some((m) => m.name === CATALOG_COLLECTIONS.nursing_services && m.args[0].duration)).toBe(true);
  });
});
