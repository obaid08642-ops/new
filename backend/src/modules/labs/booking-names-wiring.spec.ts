// Issue 1832: the bookings reads carry the catalogue names in the six languages (one batched catalogue query), the stored ar/en as the fallback.
import { LabsService } from './labs.service';
import { RadiologyOpsService } from '../radiology/radiology.service';
import { HomeCareSvc } from '../home-care/home-care.service';

const chain = (rows: unknown) => {
  const q: any = { sort: () => q, limit: () => q, lean: async () => rows, then: (res: any, rej: any) => Promise.resolve(rows).then(res, rej) };
  return q;
};
const catalogue = (rows: unknown[]) => {
  const find = jest.fn((..._args: unknown[]) => ({ lean: async () => rows }));
  return { find };
};
const row = { id: 'cbc', name_ar: 'صورة دم', name_en: 'CBC', name_ur: 'خون', name_hi: 'रक्त', name_bn: 'রক্ত', name_tl: 'Dugo' };

describe('bookings read endpoints resolve names from the catalogue (issue 1832)', () => {
  it('labs: GET bookings/mine resolves every line with ONE catalogue query; an old line without an id keeps its ar/en', async () => {
    const svc = Object.create(LabsService.prototype) as any;
    const cat = catalogue([row]);
    svc.svcModel = cat;
    svc.bkgModel = { find: () => chain([
      { id: 'b1', patient_id: 'u1', items: [{ service_id: 'cbc', name_ar: 'قديم', name_en: 'old' }] },
      { id: 'b2', patient_id: 'u1', items: [{ name_ar: 'بلا معرف', name_en: 'no id' }] },
    ]) };
    const out = await svc.mineFor({ id: 'u1' });
    expect(cat.find).toHaveBeenCalledTimes(1);
    expect(cat.find.mock.calls[0][0]).toEqual({ id: { $in: ['cbc'] } });
    expect(out[0].items[0].names).toMatchObject({ ar: 'صورة دم', en: 'CBC', hi: 'रक्त', bn: 'রক্ত', ur: 'خون', tl: 'Dugo' });
    expect(out[0].items[0].name_ar).toBe('قديم'); // the stored fields are untouched
    expect(out[1].items[0].names).toEqual({ ar: 'بلا معرف', en: 'no id' });
  });

  it('labs: a failing catalogue read leaves the bookings readable with their stored names', async () => {
    const svc = Object.create(LabsService.prototype) as any;
    svc.svcModel = { find: () => ({ lean: async () => { throw new Error('db down'); } }) };
    svc.bkgModel = { find: () => chain([{ id: 'b1', items: [{ service_id: 'cbc', name_ar: 'قديم', name_en: 'old' }] }]) };
    const out = await svc.mineFor({ id: 'u1' });
    expect(out[0].items[0].names).toEqual({ ar: 'قديم', en: 'old' });
  });

  it('radiology: mine carries items[].names and scan_names; the older center-store booking falls back', async () => {
    const svc = Object.create(RadiologyOpsService.prototype) as any;
    const mri = { id: 'mri', name_ar: 'رنين', name_en: 'MRI', name_hi: 'एमआरआई' };
    const cat = catalogue([mri]);
    svc.svcModel = cat;
    svc.userModel = { findOne: () => ({ lean: async () => ({ _id: 'm1' }) }) };
    svc.bkgModel = { find: () => chain([{ id: 'r1', createdAt: new Date('2026-10-02'), items: [{ service_id: 'mri', name_ar: 'قديم', name_en: 'old' }], scan_name_ar: 'قديم', scan_name_en: 'old' }]) };
    svc.centerBkgModel = { find: () => chain([{ id: 'r0', createdAt: new Date('2026-10-01'), scan_name_ar: 'قديم جداً', scan_name_en: 'very old', status: 'DONE' }]) };
    const out = await svc.mineFor({ id: 'u1' });
    expect(cat.find).toHaveBeenCalledTimes(1);
    expect(out[0].scan_names).toMatchObject({ ar: 'رنين', en: 'MRI', hi: 'एमआरआई' });
    expect(out[1].scan_names).toEqual({ ar: 'قديم جداً', en: 'very old' });
  });

  it('nursing: mine carries service_names from service_id; the stored service_name_ar/en stay', async () => {
    const svc = Object.create(HomeCareSvc.prototype) as any;
    const nurse = { id: 's1', name_ar: 'جروح', name_en: 'Wound care', name_tl: 'Sugat' };
    svc.svcModel = catalogue([nurse]);
    svc.bkgModel = { find: () => chain([
      { id: 'n1', service_id: 's1', service_name_ar: 'قديم', service_name_en: 'old' },
      { id: 'n2', service_name_ar: 'قديم', service_name_en: 'old' },
    ]) };
    const out = await svc.mineFor({ id: 'u1' });
    expect(out[0].service_names).toEqual({ ar: 'جروح', en: 'Wound care', tl: 'Sugat' });
    expect(out[0].service_name_ar).toBe('قديم');
    expect(out[1].service_names).toEqual({ ar: 'قديم', en: 'old' });
  });
});
