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
