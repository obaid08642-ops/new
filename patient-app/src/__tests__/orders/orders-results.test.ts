jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));

import { labResultItems, newResultsCount, parseOrdersTab, radiologyResultItems, sortResults } from '../../utils/ordersResults';

describe('ordersResults helpers', () => {
  const labs = [
    { id: 'a', booking_id: 'b1', service_name_ar: 'سكر', service_name_en: 'Sugar', reported_at: '2026-10-01T00:00:00Z', viewed_by_patient: false },
    { id: 'b', booking_id: 'b2', name: 'report.pdf', source: 'lab_booking', uploaded_at: '2026-10-05T00:00:00Z' },
    { id: 'c', viewed_by_patient: true, reported_at: '2026-09-01T00:00:00Z' },
    { service_name_en: 'no id' },
  ];

  it('reads lab results and counts only those the server says are unseen', () => {
    const items = labResultItems(labs);
    expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(newResultsCount(labs)).toBe(1);
    expect(newResultsCount({ data: labs })).toBe(1);
    expect(newResultsCount(null)).toBe(0);
  });

  it('offers a PDF only for a lab report file on a booking', () => {
    const items = labResultItems(labs);
    expect(items.find((i) => i.id === 'a')?.pdfPath).toBeNull();
    expect(items.find((i) => i.id === 'b')?.pdfPath).toEqual({ bookingId: 'b2', reportId: 'b' });
  });

  it('reads radiology reports (no seen flag, so never new) and sorts newest first', () => {
    const rads = radiologyResultItems([{ id: 'r1', items: [{ name_en: 'MRI' }], updatedAt: '2026-10-03T00:00:00Z' }]);
    expect(rads[0]).toMatchObject({ kind: 'radiology', isNew: false, pdfPath: null });
    expect(sortResults([...labResultItems(labs), ...rads]).map((i) => i.id)).toEqual(['b', 'r1', 'a', 'c']);
  });

  it('falls back to the current tab for an unknown value', () => {
    expect(parseOrdersTab('results')).toBe('results');
    expect(parseOrdersTab('previous')).toBe('previous');
    expect(parseOrdersTab('x')).toBe('current');
  });
});
