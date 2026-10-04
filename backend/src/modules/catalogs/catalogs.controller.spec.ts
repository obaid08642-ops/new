import { CatalogsController } from './catalogs.controller';

/** P6.x-2: reference specialties admin CRUD. */
describe('CatalogsController specialties admin', () => {
  const make = () => {
    const col: any = {
      find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) }) }),
      // A real updateOne reports the counts; the delete path 404s without them.
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1, matchedCount: 1 }),
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
