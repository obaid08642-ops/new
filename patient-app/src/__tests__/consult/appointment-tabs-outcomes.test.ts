import { onTab, tabOf } from '../../utils/appointmentTabs';
import { hasOutcomes, readBadgeCount, readOutcomes } from '../../utils/appointmentOutcomes';

/** Test values shaped like GET /care/appointments/:id/outcomes (backend appointment-outcomes.service.ts). */
const body = {
  appointment_id: 'a1', status: 'completed', doctor_id: 'd1', prescriptions: [], referral: null, instructions: {}, seen_at: null, unseen_count: 3,
  lab_tests: [{ code: 'CBC', resolved: true, id: 'lab-1', short_code: 'CBC', name_ar: 'صورة دم', name_en: 'Blood count' }, { code: 'XYZ', resolved: false }],
  radiology_scans: [],
  sick_leaves_and_certificates: [
    { id: 'r1', report_type: 'medical_certificate', certificate_kind: 'sick_leave', title_en: 'Sick leave', sick_leave: { start_date: '2026-10-01', end_date: '2026-10-04', duration_days: 3 }, viewed_by_patient: false, is_new: true },
    { id: 'r3', report_type: 'medical_certificate', certificate_kind: null, is_new: false },
  ],
  reports: [{ id: 'r2', report_type: 'consultation_note', title_en: 'Note', is_new: false }],
};

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
    expect(onTab('arrived', 'upcoming')).toBe(true); // the Q-18 bucket holds everything unfinished; tabOf puts it on Current
    for (const s of ['pending', 'confirmed', 'rescheduled', 'checked_in', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show', 'pending_payment', 'pending_copay', 'scheduled']) {
      expect(tabOf(s)).not.toBeNull();
    }
  });
});

describe('visit outcomes', () => {
  it('splits the outcomes of one visit by what they are, from the server flags', () => {
    const o = readOutcomes(body);
    expect(o?.sickLeaves.map((r) => r.id)).toEqual(['r1']);
    expect(o?.sickLeaves[0].sickLeave).toEqual({ start: '2026-10-01', end: '2026-10-04', days: 3 });
    expect(o?.sickLeaves[0].isNew).toBe(true);
    expect(o?.certificates.map((r) => r.id)).toEqual(['r3']);
    expect(o?.reports.map((r) => r.id)).toEqual(['r2']);
    expect(o?.unseen).toBe(3);
    expect(readOutcomes({ data: body })?.reports).toHaveLength(1);
    expect(readOutcomes('x')).toBeNull();
  });
  it('keeps the server-resolved referral items and flags the ones it could not resolve', () => {
    const o = readOutcomes(body);
    expect(o?.labs).toEqual([{ code: 'CBC', resolved: true, id: 'lab-1', name: { ar: 'صورة دم', en: 'Blood count' } }, { code: 'XYZ', resolved: false }]);
    expect(hasOutcomes(readOutcomes({ ...body, lab_tests: [], sick_leaves_and_certificates: [], reports: [] }))).toBe(false);
  });
  it('reads the badge as unseen_total', () => {
    expect(readBadgeCount({ unseen_total: 4, appointments: [{ appointment_id: 'a1', unseen: 4 }] })).toBe(4);
    expect(readBadgeCount({ unseen_total: 0, appointments: [] })).toBe(0);
    expect(readBadgeCount(null)).toBe(0);
  });
});
