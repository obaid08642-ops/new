import { DEFAULT_SHEET, passesSheet, resultCount, sheetFilterCount, sheetHomeVisit, sheetSort } from '../../utils/diagHubFilters';

/** The filter sheet of the labs / radiology hub (owner decision 4): pure state logic. TEST values. */
const row = (o: Partial<{ fastingRequired: boolean; turnaroundHours: number | null; facilityVisit: boolean }> = {}) => ({ fastingRequired: false, turnaroundHours: 12, facilityVisit: true, ...o });

describe('sheet filters', () => {
  it('the defaults count nothing and send nothing to the server', () => {
    expect(sheetFilterCount(DEFAULT_SHEET)).toBe(0);
    expect(sheetSort(DEFAULT_SHEET.sort)).toBeUndefined();
    expect(sheetHomeVisit(DEFAULT_SHEET)).toBe(false);
  });
  it('counts every option that is on', () => {
    expect(sheetFilterCount({ pay: 'insurance', place: 'home', sort: 'lowest_price', noFasting: true, sameDay: true })).toBe(5);
    expect(sheetSort('lowest_price')).toBe('lowest_price');
    expect(sheetHomeVisit({ ...DEFAULT_SHEET, place: 'home' })).toBe(true);
  });
  it('no fasting, same day and the lab keep or drop a test', () => {
    expect(passesSheet(row({ fastingRequired: true }), { ...DEFAULT_SHEET, noFasting: true }, 'lab')).toBe(false);
    expect(passesSheet(row(), { ...DEFAULT_SHEET, noFasting: true }, 'lab')).toBe(true);
    expect(passesSheet(row({ turnaroundHours: 48 }), { ...DEFAULT_SHEET, sameDay: true }, 'lab')).toBe(false);
    expect(passesSheet(row({ turnaroundHours: null }), { ...DEFAULT_SHEET, sameDay: true }, 'lab')).toBe(false);
    expect(passesSheet(row({ turnaroundHours: 24 }), { ...DEFAULT_SHEET, sameDay: true }, 'lab')).toBe(true);
    expect(passesSheet(row({ facilityVisit: false }), { ...DEFAULT_SHEET, place: 'lab' }, 'lab')).toBe(false);
  });
  it('R1: nothing here hides a scan', () => {
    expect(passesSheet(row({ fastingRequired: true, turnaroundHours: 99, facilityVisit: false }), { ...DEFAULT_SHEET, place: 'lab', noFasting: true, sameDay: true }, 'radiology')).toBe(true);
  });
  it('the count is the server total unless rows are kept back here', () => {
    expect(resultCount(20, 45, false)).toBe(45);
    expect(resultCount(7, 45, true)).toBe(7);
    expect(resultCount(20, null, false)).toBe(20);
  });
});
