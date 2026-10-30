import { CatalogsController } from './catalogs.controller';

/** P6.x-2: reference specialties admin CRUD. */
describe('CatalogsController specialties admin', () => {
  const make = () => {
    const col: any = {
      find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) }) }),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    const conn: any = { collection: jest.fn().mockReturnValue(col) };
    return { ctrl: new CatalogsController(conn), col };
  };

  it('upserts with slugified code and lists all', async () => {
    const { ctrl, col } = make();
    const out: any = await ctrl.upsertSpecialty({ name_ar: 'قلب', name_en: 'Cardiology' } as any);
    expect(out.code).toBe('cardiology');
    expect(col.updateOne).toHaveBeenCalledWith({ code: 'cardiology' }, expect.objectContaining({ $set: expect.objectContaining({ name_ar: 'قلب' }) }), { upsert: true });
    await ctrl.specialtiesAdmin();
    expect(col.find).toHaveBeenCalledWith({});
  });

  it('rejects blank names and deactivates on delete', async () => {
    const { ctrl, col } = make();
    await expect(ctrl.upsertSpecialty({ name_ar: '  ' } as any)).rejects.toThrow();
    await ctrl.deleteSpecialty('cardiology');
    expect(col.updateOne).toHaveBeenCalledWith({ code: { $eq: 'cardiology' } }, expect.objectContaining({ $set: expect.objectContaining({ active: false }) }));
  });

  it('gives Arabic-only specialties distinct codes (no shared "-" code overwriting each other)', async () => {
    const { ctrl } = make();
    const a: any = await ctrl.upsertSpecialty({ name_ar: 'قلب' } as any);
    const b: any = await ctrl.upsertSpecialty({ name_ar: 'جلدية' } as any);
    expect(a.code).toMatch(/^sp-[0-9a-f]{10}$/);
    expect(b.code).not.toBe(a.code);
    const again: any = await ctrl.upsertSpecialty({ name_ar: 'قلب' } as any);
    expect(again.code).toBe(a.code);
  });
});

/** QA 2026-10-26: the catalogue invented picture addresses on the CDN that do not exist (404 on production). */
describe('CatalogsController picture addresses', () => {
  const make = (rows: any[]) => {
    const col: any = { find: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(rows) }) }) };
    const conn: any = { collection: jest.fn().mockReturnValue(col) };
    return new CatalogsController(conn);
  };

  it.each(['labs', 'radiology', 'nursing'])('%s: a stored picture is kept, a missing one is null (never an invented CDN address)', async (type) => {
    const ctrl = make([
      { short_code: 'A', name_ar: 'أ', image_url: 'https://res.cloudinary.com/x/image/upload/lab_blood.png' },
      { short_code: 'B', name_ar: 'ب' },
      { short_code: 'C', name_ar: 'ج', image_url: '' },
      { short_code: 'D', name_ar: 'د', image_url: null },
    ]);
    const out: any[] = await ctrl.getCatalog(type) as any[];
    expect(out.map((r) => r.image_url)).toEqual(['https://res.cloudinary.com/x/image/upload/lab_blood.png', null, null, null]);
    expect(JSON.stringify(out)).not.toContain('cdn.nabd.plus');
  });
});

/** QA 2026-10-29: the public catalogue returned the record's audit and soft-delete fields (created_by, updated_by, deleted_at, is_deleted, __v). */
describe('CatalogsController public fields', () => {
  const INTERNAL = { _id: 'oid', __v: 0, created_by: 'admin-1', updated_by: 'admin-2', deleted_at: null, deleted_by: null, is_deleted: false, machine_moved: true, machine_translated_by: 'x' };
  const make = (rows: any[]) => {
    const col: any = { find: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(rows) }), sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(rows) }), toArray: jest.fn().mockResolvedValue(rows) }) };
    return new CatalogsController({ collection: jest.fn().mockReturnValue(col) } as any);
  };

  it.each(['labs', 'radiology', 'nursing', 'specialties'])('%s: no audit, soft-delete or machine-edit field; the fields a client shows stay', async (type) => {
    const out: any[] = await make([{ id: 'n1', short_code: 'IM', name_ar: 'حقن', name_en: 'Injection', price: 80, category: 'injections', duration: 30, image_url: 'https://x/y.png', description_ar: 'د', active: true, createdAt: new Date('2026-01-01'), ...INTERNAL }]).getCatalog(type) as any[];
    expect(Object.keys(out[0]).filter((k) => ['_id', '__v', 'created_by', 'updated_by', 'deleted_at', 'deleted_by', 'is_deleted', 'machine_moved', 'machine_translated_by'].includes(k))).toEqual([]);
    expect(out[0]).toMatchObject({ id: 'n1', code: 'IM', name_ar: 'حقن', name_en: 'Injection', price: 80, category: 'injections', duration: 30, image_url: 'https://x/y.png', description_ar: 'د' });
    expect(out[0].createdAt).toEqual(new Date('2026-01-01'));
  });

  it('insurance: the plan tiers of a company carry no audit fields either', async () => {
    const companies = [{ id: 'c1', code: 'bupa', name_ar: 'بوبا', name_en: 'Bupa', is_active: true, ...INTERNAL }];
    const networks = [{ id: 'p1', company_id: 'c1', name_en: 'Gold', tier_level: 2, ...INTERNAL }];
    const col = (rows: any[]) => ({ find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(rows) }), toArray: jest.fn().mockResolvedValue(rows) }) });
    const conn: any = { collection: jest.fn((name: string) => (name === 'insurance_networks' ? col(networks) : col(companies))) };
    const out: any[] = await new CatalogsController(conn).getCatalog('insurance') as any[];
    expect(out[0].plans).toHaveLength(1);
    expect(Object.keys(out[0].plans[0])).toEqual(expect.arrayContaining(['id', 'name_en', 'tier_level']));
    expect(JSON.stringify(out)).not.toMatch(/created_by|updated_by|deleted_at|is_deleted|__v|machine_/);
  });
});

/** Catalogue completion (2026-10-29): hidden duplicates stay out of the public list, the nursing booking mode and its options reach the client. */
describe('CatalogsController hidden rows and nursing booking modes', () => {
  const make = (rows: any[]) => {
    const col: any = { find: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(rows) }) }) };
    const conn: any = { collection: jest.fn().mockReturnValue(col) };
    return { ctrl: new CatalogsController(conn), col };
  };

  it.each(['labs', 'radiology', 'nursing'])('%s: the query leaves out soft-deleted (merged duplicate) rows', async (type) => {
    const { ctrl, col } = make([{ code: 'A', name_ar: 'أ', name_en: 'A', active: true }]);
    await ctrl.getCatalog(type);
    expect(col.find.mock.calls[0][0]).toMatchObject({ is_deleted: { $ne: true } });
  });

  it('nursing: booking_mode and booking_options are in the public row', async () => {
    const options = { hours: [4, 8, 12, 24], shift: ['day', 'night'], period: ['day', 'week', 'month', 'open'] };
    const { ctrl } = make([{ code: 'CAREGIVER_HOURLY', name_ar: 'مرافق', name_en: 'Caregiver', active: true, booking_mode: 'continuous', booking_options: options, created_by: 'x' }]);
    const rows: any[] = (await ctrl.getCatalog('nursing')) as any[];
    expect(rows[0]).toMatchObject({ booking_mode: 'continuous', booking_options: options });
    expect(rows[0].created_by).toBeUndefined();
  });
});
