import { toMedicationViews, reminderPayload, dosingTimes } from './prescription-view';

describe('prescription view', () => {
  const rx = {
    id: 'rx-1',
    items: [
      { medicine_name_ar: 'باراسيتامول', medicine_name_en: 'Paracetamol', dose: '500mg', duration_days: 5, instructions: 'كل 8 ساعات' },
      { medicine_id: 'med-9', medicine_name_ar: 'أموكسيسيلين', dose: '250mg', duration_days: 7 },
      { medicine_name_ar: 'محذوف', dose: '1', duration_days: 1, is_deleted: true },
    ],
  };

  it('maps API items (no ids) to stable medicine views', () => {
    const v = toMedicationViews(rx);
    expect(v.map((m) => m.id)).toEqual(['rx-1-0', 'rx-1-1']);
    expect(v[0]).toEqual(expect.objectContaining({ name: 'باراسيتامول', dose: '500mg', duration: '5 يوم', instruction: 'كل 8 ساعات' }));
    expect(v[1].medicine_id).toBe('med-9');
  });

  it('builds a reminder the server accepts (name + dose)', () => {
    const p = reminderPayload(toMedicationViews(rx)[0], 'rx-1');
    expect(p).toEqual(expect.objectContaining({ medication_name: 'باراسيتامول', dose: '500mg', frequency: 'daily', duration_days: 5, prescription_id: 'rx-1', source: 'doctor' }));
  });

  it('returns nothing for a prescription without items', () => {
    expect(toMedicationViews({ id: 'x' })).toEqual([]);
    expect(toMedicationViews(null)).toEqual([]);
  });

  it('derives dose times from the instruction', () => {
    expect(dosingTimes('كل 8 ساعات')).toEqual(['00:00', '08:00', '16:00']);
    expect(dosingTimes('مرتين يومياً بعد الأكل')).toEqual(['08:00', '20:00']);
    expect(dosingTimes('')).toEqual(['08:00']);
    const p = reminderPayload(toMedicationViews({ id: 'r', items: [{ medicine_name_ar: 'x', dose: '1', instructions: 'كل 12 ساعة' }] })[0], 'r');
    expect(p.times).toEqual(['08:00', '20:00']);
    expect(typeof p.time_zone).toBe('string');
  });
});
