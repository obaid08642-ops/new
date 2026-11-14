import { buildIssueBody, endFor, issueErrorKey, normalizeSehaNumber, parseDay, restDays, sehaStatusOf } from '../medicalReport';

const base = { appointmentId: 'a1', patientId: 'p1', from: '2026-11-10', to: '2026-11-12', reason: 'Rest advised', diagnosis: '', showDiagnosis: false };

describe('PT-08 medical report (doctor)', () => {
  it('counts rest days with both ends included and rejects non-dates', () => {
    expect(restDays('2026-11-10', '2026-11-12')).toBe(3);
    expect(restDays('2026-11-10', '2026-11-10')).toBe(1);
    expect(restDays('2026-02-30', '2026-03-02')).toBeNull();
    expect(parseDay('10/11/2026')).toBeNull();
    expect(endFor('2026-11-10', 3)).toBe('2026-11-12');
    expect(endFor('2026-11-10', 0)).toBeNull();
  });

  it('builds the body from the period; the diagnosis is optional and shown only when asked', () => {
    const r = buildIssueBody(base);
    expect(r).toEqual({ body: { patient_id: 'p1', appointment_id: 'a1', start_date: '2026-11-10', duration_days: 3, reason: 'Rest advised', diagnosis: 'Rest advised', show_diagnosis: false } });
    const d = buildIssueBody({ ...base, diagnosis: ' Flu ', showDiagnosis: true });
    expect('body' in d && d.body.diagnosis).toBe('Flu');
    expect('body' in d && d.body.show_diagnosis).toBe(true);
  });

  it('names the first problem', () => {
    expect(buildIssueBody({ ...base, appointmentId: '' })).toEqual({ problem: 'appointment' });
    expect(buildIssueBody({ ...base, patientId: null })).toEqual({ problem: 'patient' });
    expect(buildIssueBody({ ...base, from: 'x' })).toEqual({ problem: 'from' });
    expect(buildIssueBody({ ...base, to: '2026-13-01' })).toEqual({ problem: 'to' });
    expect(buildIssueBody({ ...base, to: '2026-11-09' })).toEqual({ problem: 'order' });
    expect(buildIssueBody({ ...base, to: '2026-12-20' })).toEqual({ problem: 'long' });
    expect(buildIssueBody({ ...base, reason: '  ' })).toEqual({ problem: 'reason' });
    expect(buildIssueBody({ ...base, showDiagnosis: true })).toEqual({ problem: 'diagnosis' });
  });

  it('checks the Seha number like the server (6-30 capitals, digits, hyphens)', () => {
    expect(normalizeSehaNumber(' ab-12345 ')).toEqual({ value: 'AB-12345' });
    expect(normalizeSehaNumber('123')).toEqual({ invalid: true });
    expect(normalizeSehaNumber('AB 12345')).toEqual({ invalid: true });
    expect(normalizeSehaNumber('A'.repeat(31))).toEqual({ invalid: true });
  });

  it('pending until a number exists', () => {
    expect(sehaStatusOf({})).toBe('pending');
    expect(sehaStatusOf({ seha_status: 'pending', seha_number: null })).toBe('pending');
    expect(sehaStatusOf({ seha_status: 'registered', seha_number: 'AB-12345' })).toBe('registered');
  });

  it('maps the server problem codes to wording keys', () => {
    expect(issueErrorKey('sick_leave_before_consultation')).toBe('medicalReport.err.beforeConsultation');
    expect(issueErrorKey(['sick_leave_duration_invalid'])).toBe('medicalReport.err.duration');
    expect(issueErrorKey('other')).toBeNull();
  });
});
