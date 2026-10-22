import { addUnique, buildPayload, canSend, clampInt, emptyComposer, isVisitedStatus, mapOrderError, parseVisits } from '../medicalOrderLogic';

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

describe('medicalOrderLogic visits and window errors', () => {
  const err = (message: string) => ({ response: { data: { message } } });

  it('maps visit_window_closed and appointment_not_visited to clear Arabic and English messages', () => {
    expect(mapOrderError(err('visit_window_closed'), false)).toBe('The time allowed for writing an order for this visit has ended');
    expect(mapOrderError(err('visit_window_closed'), true)).toContain('انتهت المدة');
    expect(mapOrderError(err('appointment_not_visited'), false)).toBe('You can write an order only after the visit');
    expect(mapOrderError(err('appointment_not_visited'), true)).toContain('قبل أن يتم الكشف');
  });

  it('reads the visits list (array or { data }), keeps id/status/patient_id/date and drops rows without an id', () => {
    const rows = [{ id: 'a1', status: 'in_progress', patient_id: 'p1', date: '2026-10-20T10:00:00.000Z' }, { status: 'completed' }, { id: 'a2', status: 'completed', patient_id: 'p2' }];
    expect(parseVisits(rows)).toEqual([
      { id: 'a1', status: 'in_progress', patient_id: 'p1', date: '2026-10-20T10:00:00.000Z' },
      { id: 'a2', status: 'completed', patient_id: 'p2', date: null },
    ]);
    expect(parseVisits({ data: rows })).toHaveLength(2);
    expect(parseVisits(null)).toEqual([]);
  });
});
