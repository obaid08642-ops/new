import { CareService } from './care.service';

// Walkthrough of the website (issue 1550): a doctor's `hospital` is free text in Arabic, so an English, Hindi, Bengali or
// Filipino page drew an Arabic hospital name on every doctor card. A list now carries the public facility's own names.
const svcWith = (rows: any[]) => {
  const calls: any[] = [];
  const svc: any = Object.create(CareService.prototype);
  svc.facilityModel = { find: async (q: any, p: any) => { calls.push({ q, p }); return rows; } };
  return { svc: svc as CareService, calls };
};

describe('CareService.attachFacilityNames', () => {
  it('adds the facility names to every doctor of the page with one query, only active facilities', async () => {
    const { svc, calls } = svcWith([{ id: 'dallah', name_ar: 'مستشفى دله', name_en: 'Dallah Hospital' }]);
    const items: any[] = [{ id: 'd1', hospital: 'مستشفى دله', facility_id: 'dallah' }, { id: 'd2', facility_id: 'dallah' }, { id: 'd3', facility_id: 'hidden' }, { id: 'd4' }];
    await svc.attachFacilityNames(items);
    expect(items[0]).toMatchObject({ facility_name_ar: 'مستشفى دله', facility_name_en: 'Dallah Hospital' });
    expect(items[1].facility_name_en).toBe('Dallah Hospital');
    expect(items[2].facility_name_en).toBeUndefined();
    expect(items[3].facility_name_en).toBeUndefined();
    expect(calls).toHaveLength(1);
    expect(calls[0].q).toEqual({ id: { $in: ['dallah', 'hidden'] }, is_active: true });
    expect(calls[0].p).toEqual({ _id: 0, id: 1, name_ar: 1, name_en: 1 }); // nothing but the two names
  });

  it('asks nothing when no doctor has a facility', async () => {
    const { svc, calls } = svcWith([]);
    await svc.attachFacilityNames([{ id: 'x' }, { id: 'y', facility_id: null }]);
    expect(calls).toHaveLength(0);
  });
});
