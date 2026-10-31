import { readOutcomes } from '../../utils/appointmentOutcomes';

/** PT-08: the sick leave a doctor issued, as the patient app reads it. TEST payloads; nothing is made up when a field is missing. */
const base = { appointment_id: 'appt-1', unseen_count: 0, prescriptions: [], lab_tests: [], radiology_scans: [], reports: [] };
const leave = (extra: Record<string, unknown>) => readOutcomes({ ...base, sick_leaves_and_certificates: [{ id: 'r1', certificate_kind: 'sick_leave', ...extra }] });

describe('sick leave in the visit outcomes', () => {
  it('reads dates and days as sent', () => {
    expect(leave({ sick_leave: { start_date: '2026-10-01', end_date: '2026-10-04', duration_days: 3 } })?.sickLeaves[0].sickLeave).toEqual({ start: '2026-10-01', end: '2026-10-04', days: 3 });
  });
  it('a leave without dates or days keeps nulls, it does not compute them', () => {
    expect(leave({ sick_leave: {} })?.sickLeaves[0].sickLeave).toEqual({ start: null, end: null, days: null });
    expect(leave({ sick_leave: { duration_days: '3' } })?.sickLeaves[0].sickLeave?.days).toBeNull();
  });
  it('a sick leave without its details is still a sick leave row, with no detail object', () => {
    const o = leave({});
    expect(o?.sickLeaves).toHaveLength(1);
    expect(o?.sickLeaves[0].sickLeave).toBeNull();
  });
  it('a row without an id is dropped; a certificate that is not a sick leave goes to certificates', () => {
    const o = readOutcomes({ ...base, sick_leaves_and_certificates: [{ certificate_kind: 'sick_leave' }, { id: 'c1', certificate_kind: 'fitness' }] });
    expect(o?.sickLeaves).toHaveLength(0);
    expect(o?.certificates.map((r) => r.id)).toEqual(['c1']);
  });
  it('is new only when the server says so', () => {
    expect(leave({ is_new: true })?.sickLeaves[0].isNew).toBe(true);
    expect(leave({ is_new: 'yes' })?.sickLeaves[0].isNew).toBe(false);
  });
});
