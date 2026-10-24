import { insuredShare, parseCopay, readFollowUpActions, readLateGuarantee, readLicenseLine } from './differentiators';
import { BOOK_NOW_HREF, buildDoctorsPath, keepsServerOrder } from './consultNearby';
import { DOCTOR_SORTS, sortFromParam } from './doctorSearch';
import { parseQuote } from './ordering';
import { mapNotification } from './notificationsFeed';

/** Every value is a TEST value. */

describe('1. late-appointment guarantee setting', () => {
  it('reads the minutes and points the server sends', () => {
    expect(readLateGuarantee({ late_guarantee: { minutes: 30, points: 50 } })).toEqual({ minutes: 30, points: 50 });
  });
  it('is hidden (null) when the setting is absent, partial or not positive whole numbers', () => {
    expect(readLateGuarantee(null)).toBeNull();
    expect(readLateGuarantee({})).toBeNull();
    expect(readLateGuarantee({ cancellation_policy: {} })).toBeNull();
    expect(readLateGuarantee({ late_guarantee: { minutes: 30 } })).toBeNull();
    expect(readLateGuarantee({ late_guarantee: { minutes: 0, points: 50 } })).toBeNull();
    expect(readLateGuarantee({ late_guarantee: { minutes: 30, points: -1 } })).toBeNull();
    expect(readLateGuarantee({ late_guarantee: { minutes: '30', points: 50 } })).toBeNull();
    expect(readLateGuarantee({ late_guarantee: { minutes: 1.5, points: 50 } })).toBeNull();
  });
});

describe('2. card copay fields', () => {
  it('sends nothing when both are empty and only the filled one otherwise', () => {
    expect(parseCopay('', '')).toEqual({ ok: true, body: {} });
    expect(parseCopay(' 20 ', '')).toEqual({ ok: true, body: { copay_percent: 20 } });
    expect(parseCopay('', '150.5')).toEqual({ ok: true, body: { copay_cap_sar: 150.5 } });
    expect(parseCopay('0', '0')).toEqual({ ok: true, body: { copay_percent: 0, copay_cap_sar: 0 } });
    expect(parseCopay('100', '1000000')).toEqual({ ok: true, body: { copay_percent: 100, copay_cap_sar: 1000000 } });
  });
  it('reads Arabic-Indic digits and a decimal comma', () => {
    expect(parseCopay('٢٠', '١٥٠٫٥')).toEqual({ ok: true, body: { copay_percent: 20, copay_cap_sar: 150.5 } });
    expect(parseCopay('12,5', '')).toEqual({ ok: true, body: { copay_percent: 12.5 } });
  });
  it('rejects a percent outside 0..100 and a cap below 0, above the server max, or not a number', () => {
    expect(parseCopay('101', '')).toEqual({ ok: false, field: 'percent' });
    expect(parseCopay('-5', '')).toEqual({ ok: false, field: 'percent' });
    expect(parseCopay('abc', '')).toEqual({ ok: false, field: 'percent' });
    expect(parseCopay('20', '-1')).toEqual({ ok: false, field: 'cap' });
    expect(parseCopay('20', '1000001')).toEqual({ ok: false, field: 'cap' });
    expect(parseCopay('20', '12x')).toEqual({ ok: false, field: 'cap' });
  });
});

describe('2. insured share line', () => {
  it('is the estimate only when every provider carries estimated_patient_share', () => {
    expect(insuredShare([40.5, 10])).toEqual({ kind: 'estimate', amount: 50.5 });
    expect(insuredShare([0])).toEqual({ kind: 'estimate', amount: 0 });
  });
  it('falls back to "accepted" when any estimate is missing, or there is nothing', () => {
    expect(insuredShare([40, null])).toEqual({ kind: 'accepted' });
    expect(insuredShare([null])).toEqual({ kind: 'accepted' });
    expect(insuredShare([])).toEqual({ kind: 'accepted' });
  });
  it('parseQuote carries estimated_patient_share when the server sends it and null when it does not', () => {
    const row = (id: string) => ({ provider_id: id, total: 100, in_network: true, covers_all: true, missing: [] });
    const quote = (extra: Record<string, unknown>) => parseQuote({ quote_id: 'q', expires_at: '2026-10-24T10:00:00Z', estimate: true, groups: [{ mode: 'facility', items: [{ catalog_id: 'a' }], from_price: null, best_match: { ...row('p1'), items: [{ catalog_id: 'a', price: 100, coverage: 'covered' }], estimated_insurance_share: 80, patient_share: 20, ...extra }, compare: [], split_suggestion: null, empty: null }], from_price: null });
    expect(quote({ estimated_patient_share: 30 })?.groups[0].best_match?.estimated_patient_share).toBe(30);
    expect(quote({ estimated_patient_share: null })?.groups[0].best_match?.estimated_patient_share).toBeNull();
    expect(quote({})?.groups[0].best_match?.estimated_patient_share).toBeNull();
  });
});

describe('3. licence line', () => {
  it('reads the number and the verified flag of license', () => {
    expect(readLicenseLine({ license: { number: ' 12-34 ', authority: 'SCFHS', verified: true } })).toEqual({ number: '12-34', verified: true });
    expect(readLicenseLine({ license: { number: '12-34', authority: 'SCFHS', verified: false } })).toEqual({ number: '12-34', verified: false });
  });
  it('falls back to the older SCFHS number fields, and to license_verified', () => {
    expect(readLicenseLine({ scfhs_license_no: '99' })).toEqual({ number: '99', verified: false });
    expect(readLicenseLine({ scfhs_license_number: '98', license_verified: true })).toEqual({ number: '98', verified: true });
  });
  it('does not take admin approval (`verified`) for a verified licence', () => {
    expect(readLicenseLine({ verified: true, scfhs_license_no: '99' })).toEqual({ number: '99', verified: false });
  });
  it('is hidden without a number, and never carries a date', () => {
    expect(readLicenseLine(null)).toBeNull();
    expect(readLicenseLine({})).toBeNull();
    expect(readLicenseLine({ license: { number: null, verified: true } })).toBeNull();
    expect(readLicenseLine({ license: { number: '  ' } })).toBeNull();
    expect(Object.keys(readLicenseLine({ license: { number: '1', expiry_date: '2030-01-01' } }) ?? {}).sort()).toEqual(['number', 'verified']);
  });
});

describe('4. available-today sort and the book-now entry', () => {
  it('is one of the offered sorts and is read from the route', () => {
    expect(DOCTOR_SORTS).toContain('available_today');
    expect(sortFromParam('available_today')).toBe('available_today');
    expect(sortFromParam(['available_today'])).toBe('available_today');
    expect(sortFromParam('price_asc')).toBe('price_asc');
    expect(sortFromParam('bogus')).toBeNull();
    expect(sortFromParam(undefined)).toBeNull();
  });
  it('asks the server for sort=available_today and keeps its order', () => {
    const path = buildDoctorsPath({ mode: 'clinic', nearest: false, availableNow: false, place: null, availableToday: true });
    expect(path).toBe('/care/doctors?type=clinic&sort=available_today');
    expect(keepsServerOrder(path)).toBe(true);
  });
  it('is the plain request without it, and "Nearest" wins over it', () => {
    expect(buildDoctorsPath({ mode: 'clinic', nearest: false, availableNow: false, place: null })).toBe('/providers?type=doctor');
    const both = buildDoctorsPath({ mode: 'clinic', nearest: true, availableNow: false, place: { kind: 'coords', lat: 24.7, lng: 46.7 }, availableToday: true });
    expect(both).toContain('sort=distance');
    expect(both).not.toContain('available_today');
  });
  it('every book-now entry opens the hub with the sort preselected', () => {
    expect(BOOK_NOW_HREF).toBe('/(tabs)/consultations?sort=available_today');
  });
});

describe('5. visit summary actions', () => {
  const future = '2999-01-01T00:00:00.000Z';
  const lab = { kind: 'lab_booking', medical_order_id: 'o1', first_item_id: 'i1', item_ids: ['i1'], catalog_ids: ['c1'], valid_until: future };
  it('reads the three kinds the server sends, in its order', () => {
    const rx = { kind: 'pharmacy_order', prescription_id: 'rx1' };
    const scan = { ...lab, kind: 'radiology_booking', medical_order_id: 'o2', first_item_id: 'i9' };
    expect(readFollowUpActions({ follow_up_actions: [rx, lab, scan] })).toEqual([
      { kind: 'pharmacy_order', prescriptionId: 'rx1' },
      { kind: 'lab_booking', orderId: 'o1', firstItemId: 'i1' },
      { kind: 'radiology_booking', orderId: 'o2', firstItemId: 'i9' },
    ]);
  });
  it('drops expired orders, keeps ones without a date, and drops unknown or incomplete rows', () => {
    const now = Date.parse('2026-10-24T00:00:00Z');
    expect(readFollowUpActions({ follow_up_actions: [{ ...lab, valid_until: '2026-10-01T00:00:00Z' }] }, now)).toEqual([]);
    expect(readFollowUpActions({ follow_up_actions: [{ ...lab, valid_until: null }] }, now)).toHaveLength(1);
    expect(readFollowUpActions({ follow_up_actions: [{ kind: 'teleport' }, { kind: 'pharmacy_order' }, { kind: 'lab_booking', medical_order_id: 'o1' }, null, 5] }, now)).toEqual([]);
  });
  it('is empty when the field is absent or malformed', () => {
    expect(readFollowUpActions(null)).toEqual([]);
    expect(readFollowUpActions({})).toEqual([]);
    expect(readFollowUpActions({ follow_up_actions: 'x' })).toEqual([]);
  });
});

describe('late-compensation notification', () => {
  it('has a title, a body and an icon even when the row arrives empty, and keeps the server text when present', () => {
    const text = (key: string) => `T:${key}`;
    expect(mapNotification({ id: 'n1', type: 'late_compensation' }, text)).toMatchObject({ title: 'T:notifications.late.title', body: 'T:notifications.late.body', icon: 'clock-counter-clockwise', group: 'system' });
    expect(mapNotification({ id: 'n2', type: 'late_compensation', title: 'Server title', body: 'Server body' }, text)).toMatchObject({ title: 'Server title', body: 'Server body' });
    expect(mapNotification({ id: 'n3', type: 'info' }, text)).toMatchObject({ title: '', body: '' });
  });
});
