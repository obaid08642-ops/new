import { addUnique, buildPayload, canSend, clampInt, emptyComposer, isVisitedStatus, mapOrderError } from '../medicalOrderLogic';

const it1 = { catalog_id: 'l1', name_ar: 'أ', name_en: 'A' };

describe('medicalOrderLogic', () => {
  it('empty composer cannot be sent and sends no groups', () => {
    const s = emptyComposer();
    expect(canSend(s)).toBe(false);
    expect(buildPayload(s)).toEqual({ valid_days: 30 });
  });
  it('builds groups, nursing series, prescription, notes, no provider', () => {
    const s = { ...emptyComposer(), labs: [it1], nursing: [{ ...it1, catalog_id: 'n1', sessions: 5, interval_days: 2 }], prescriptionId: 'rx1', validDays: 90 as const, notes: ' fast ' };
    expect(canSend(s)).toBe(true);
    expect(buildPayload(s)).toEqual({ labs: [{ catalog_id: 'l1' }], nursing: [{ catalog_id: 'n1', sessions: 5, interval_days: 2 }], prescription_id: 'rx1', valid_days: 90, notes: 'fast' });
  });
  it('rejects invalid nursing sessions', () => {
    const s = { ...emptyComposer(), nursing: [{ ...it1, catalog_id: 'n1', sessions: 31, interval_days: 1 }] };
    expect(canSend(s)).toBe(false);
  });
  it('addUnique ignores duplicates; clampInt bounds', () => {
    expect(addUnique([it1], it1)).toHaveLength(1);
    expect(clampInt('99', 1, 30, 1)).toBe(30);
    expect(clampInt('', 1, 30, 7)).toBe(7);
  });
  it('maps backend codes', () => {
    const e = (m: any) => ({ response: { data: { message: m } } });
    expect(mapOrderError(e('medical_order_empty'), false)).toMatch(/at least one/);
    expect(mapOrderError(e(['valid_days_invalid']), true)).toMatch(/30/);
    expect(mapOrderError(e('appointment_not_visited'), true)).toMatch(/الكشف/);
    expect(mapOrderError({}, false)).toMatch(/connection/);
    expect(mapOrderError(e('weird'), false)).toBe('Could not send the order');
  });
  it('visited statuses', () => {
    expect(isVisitedStatus('COMPLETED')).toBe(true);
    expect(isVisitedStatus('in_progress')).toBe(true);
    expect(isVisitedStatus('scheduled')).toBe(false);
  });
});
