import { onTab, tabOf } from '../../utils/appointmentTabs';
import { newOutcomeCount, outcomeReports, outcomesOf, readReferrals } from '../../utils/appointmentOutcomes';

/** Test values shaped like GET /medical-reports/mine and GET /care/appointments/:id/summary. */
const reports = [
  { id: 'r1', appointment_id: 'a1', report_type: 'medical_certificate', certificate_kind: 'sick_leave', title_ar: 'إجازة', title_en: 'Sick leave', sick_leave: { start_date: '2026-10-01', end_date: '2026-10-04', duration_days: 3 }, viewed_by_patient: false },
  { id: 'r2', appointment_id: 'a1', report_type: 'consultation_note', title_en: 'Note', viewed_by_patient: true },
  { id: 'r3', appointment_id: 'a2', report_type: 'medical_certificate', viewed_by_patient: false },
  { id: 'r4', report_type: 'clinic_note', viewed_by_patient: false },
  { id: 'r5', appointment_id: 'a3', report_type: 'other' },
];

describe('appointment tabs', () => {
  it('puts each server status on exactly one tab, case-insensitively', () => {
    expect(tabOf('CONFIRMED')).toBe('upcoming');
    expect(tabOf('pending_payment')).toBe('upcoming');
    expect(tabOf('IN_PROGRESS')).toBe('current');
    expect(tabOf('en_route')).toBe('current');
    expect(tabOf('COMPLETED')).toBe('past');
    expect(tabOf('NO_SHOW')).toBe('past');
    expect(tabOf('something_else')).toBeNull();
    expect(onTab('arrived', 'current')).toBe(true);
    expect(onTab('arrived', 'upcoming')).toBe(false);
  });
});

describe('visit outcomes', () => {
  it('counts only unopened results of a visit, from the server flag', () => {
    expect(newOutcomeCount(reports)).toBe(2);
    expect(newOutcomeCount({ data: reports })).toBe(2);
    expect(newOutcomeCount(null)).toBe(0);
    expect(newOutcomeCount('x')).toBe(0);
  });
  it('splits the results of one visit by what they are', () => {
    const a1 = outcomesOf(reports, 'a1');
    expect(a1.sickLeaves.map((r) => r.id)).toEqual(['r1']);
    expect(a1.sickLeaves[0].sickLeave).toEqual({ start: '2026-10-01', end: '2026-10-04', days: 3 });
    expect(a1.reports.map((r) => r.id)).toEqual(['r2']);
    expect(outcomesOf(reports, 'a2').certificates.map((r) => r.id)).toEqual(['r3']);
    expect(outcomesOf(reports, 'none')).toEqual({ sickLeaves: [], certificates: [], reports: [] });
    expect(outcomeReports(reports).find((r) => r.id === 'r5')?.isNew).toBe(false);
  });
  it('reads the referrals of the summary and nothing else', () => {
    expect(readReferrals({ referrals: { lab_tests: ['CBC', ' '], radiology_scans: ['XR1'] } })).toEqual({ labs: ['CBC'], scans: ['XR1'] });
    expect(readReferrals({ referrals: { lab_tests: [], radiology_scans: [] } })).toBeNull();
    expect(readReferrals({})).toBeNull();
  });
});
