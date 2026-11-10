import { normaliseNationalId } from '../../common/patient-national-id';
import { resetFieldCrypto } from '../../common/pdpl-compliance.module';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { initialsOf, maskNationalId, newVerifyCode, planLeave, riyadhDay, serialOf, CODE_RE } from './sick-leave-rules';
import { SickLeaveService } from './sick-leave.service';
import { renderSickLeavePdf } from './sick-leave-pdf';
import { registerAuditSink } from '../../common/audit-record';

// PT-08 (owner decision 2026-11-09): the sick leave is a certificate with rules. The rules first, then the service against an in-memory store.
const CONSULT = new Date('2026-11-09T09:00:00Z');                 // 12:00 on 9 November in Riyadh
const NOW = new Date('2026-11-09T10:30:00Z');

describe('planLeave: no back-dating, inclusive end, 1 to 30 days', () => {
  it('starts today (Riyadh) by default, for 1 day, and the end is the last day off', () => {
    const p = planLeave({}, CONSULT, NOW);
    expect(p.start.toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(p.days).toBe(1);
    const three = planLeave({ duration_days: 3 }, CONSULT, NOW);
    expect(three.end.toISOString()).toBe('2026-11-11T00:00:00.000Z');
  });

  it('a visit opened before its day defaults to starting on the consultation day, not before it', () => {
    const early = new Date('2026-11-08T09:00:00Z');                   // the doctor opened tomorrow's consultation today
    expect(planLeave({}, CONSULT, early).start.toISOString()).toBe('2026-11-09T00:00:00.000Z');
  });

  it('cannot start before the day of the consultation', () => {
    expect(() => planLeave({ start_date: '2026-11-08' }, CONSULT, NOW)).toThrow('sick_leave_before_consultation');
    expect(() => planLeave({ start_date: '2026-11-08T23:00:00Z' }, CONSULT, NOW)).toThrow('sick_leave_before_consultation');
    expect(planLeave({ start_date: '2026-11-09' }, CONSULT, NOW).start.toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(planLeave({ start_date: '2026-11-10', duration_days: 2 }, CONSULT, NOW).end.toISOString()).toBe('2026-11-11T00:00:00.000Z');
  });

  it('the consultation day is the Riyadh day: 23:30 UTC on the 8th is already the 9th there', () => {
    const lateNight = new Date('2026-11-08T21:30:00Z');             // 00:30 on the 9th in Riyadh
    expect(riyadhDay(lateNight)).toBe('2026-11-09');
    expect(() => planLeave({ start_date: '2026-11-08' }, lateNight, NOW)).toThrow('sick_leave_before_consultation');
  });

  it('not more than 30 days after the consultation, and 1 to 30 whole days', () => {
    expect(() => planLeave({ start_date: '2026-12-10' }, CONSULT, NOW)).toThrow('sick_leave_start_too_late');
    expect(planLeave({ start_date: '2026-12-09' }, CONSULT, NOW).days).toBe(1);
    for (const d of [0, -1, 31, 2.5, 'x']) expect(() => planLeave({ duration_days: d }, CONSULT, NOW)).toThrow('sick_leave_duration_invalid');
    expect(planLeave({ duration_days: 30 }, CONSULT, NOW).days).toBe(30);
    expect(() => planLeave({ start_date: 'soon' }, CONSULT, NOW)).toThrow('invalid start_date');
  });
});

describe('codes, serials, masks', () => {
  it('a verify code is 8 characters from an alphabet without 0/O/1/I; a serial is year + 6 digits', () => {
    for (let i = 0; i < 200; i++) expect(newVerifyCode()).toMatch(CODE_RE);
    expect(serialOf(2026, 42)).toBe('MED-2026-000042');
    expect('O0I1l'.split('').some((c) => CODE_RE.test(`ABCDEFG${c}`))).toBe(false);
  });
  it('the ID number shows its last 3 characters only; initials are at most 3 letters', () => {
    expect(maskNationalId('1234567890')).toBe('*******890');
    expect(maskNationalId('12')).toBe('**');
    expect(maskNationalId(undefined)).toBeNull();
    expect(initialsOf('Sara Ahmed Ali Hassan')).toBe('S. A. A.');
    expect(initialsOf('سارة أحمد')).toBe('س. أ.');
    expect(initialsOf('')).toBeNull();
  });
});

// ── the service, against an in-memory store ──────────────────────────────────────────────────────────────────────────────────────────────
function store() {
  const data: Record<string, any[]> = { medicalreports: [], appointments: [], provider_profiles: [], users: [], provider_accounts: [], sick_leave_counters: [], patient_identity: [], patient_profiles: [] };
  const eq = (a: any, b: any) => (b === null ? a == null : a === b);
  const match = (row: any, f: any): boolean => Object.entries(f).every(([k, v]: [string, any]) => {
    if (k === '$or') return (v as any[]).some((c) => match(row, c));
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('$in' in v) return v.$in.includes(row[k]);
      if ('$eq' in v) return eq(row[k], v.$eq);
      if ('$ne' in v) return row[k] !== v.$ne;
      if ('$exists' in v) return (row[k] !== undefined) === v.$exists;
      if ('$lte' in v) return row[k] != null && new Date(row[k]).getTime() <= new Date(v.$lte).getTime();
    }
    return eq(row[k], v);
  });
  const coll = (name: string) => ({
    findOne: async (f: any) => data[name].find((r) => match(r, f)) ?? null,
    find: (f: any) => ({ sort: () => ({ limit: () => ({ toArray: async () => data[name].filter((r) => match(r, f)) }) }) }),
    insertOne: async (d: any) => {
      if (name === 'medicalreports' && d.verify_code && data[name].some((r) => r.verify_code === d.verify_code)) throw Object.assign(new Error('dup'), { code: 11000 });
      data[name].push(d);
    },
    createIndex: async () => 'ok',
    updateOne: async (f: any, u: any, o?: any) => {
      let r = data[name].find((x) => match(x, f));
      if (!r && o?.upsert) { r = { ...(u.$setOnInsert || {}) }; data[name].push(r); }
      if (!r) return { matchedCount: 0 };
      if (u.$set) Object.assign(r, u.$set);
      if (u.$push) for (const [k, v] of Object.entries(u.$push)) (r[k] ??= []).push(v);
      return { matchedCount: 1 };
    },
    findOneAndUpdate: async (f: any, u: any) => {
      let r = data[name].find((x) => x._id === f._id);
      if (!r) { r = { _id: f._id, seq: 0 }; data[name].push(r); }
      r.seq += u.$inc.seq;
      return { value: r };
    },
  });
  return { data, conn: { collection: (n: string) => coll(n) } as any };
}

function world(opts: { status?: string; requested?: boolean } = {}) {
  const s = store();
  s.data.appointments.push({ id: 'appt-1', tracking_id: 'APT-0001', patient_id: 'pat-1', doctor_id: 'prof-1', doctor_user_id: 'doc-1', status: opts.status ?? 'IN_PROGRESS', slot_start: CONSULT, sick_leave_requested: opts.requested });
  s.data.provider_profiles.push({ id: 'prof-1', name_ar: 'د. سامي', specialty: 'cardiology', scfhs_license_number: '12-R-34567' });
  s.data.users.push({ id: 'pat-1', full_name: 'Sara Ahmed Ali', national_id: '1098765432' });
  s.data.provider_accounts.push({ _id: 'acc-1', user_id: 'doc-1', display_name: 'Clinic' });
  const events = { emit: jest.fn() } as any;
  const notifications = { create: jest.fn().mockResolvedValue({}) } as any;
  const svc = new SickLeaveService(s.conn, events, notifications);
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval'] });
  return { svc, events, notifications, ...s };
}
afterEach(() => { jest.useRealTimers(); });
const DOCTOR = { id: 'doc-1', role: 'doctor', full_name: 'Dr Sami' };
const ISSUE = { patient_id: 'pat-1', diagnosis: 'viral pharyngitis', duration_days: 3, reason: 'Acute illness, rest advised' };

describe('SickLeaveService.issue', () => {
  it('issues a certificate on the doctor\'s own consultation with serial, code, consultation, licence; the diagnosis is hidden unless the doctor shows it', async () => {
    const w = world({ requested: true });
    const out = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    expect(out).toMatchObject({ ok: true, serial: 'MED-2026-000001', days: 3 });
    expect(out.code).toMatch(CODE_RE);
    expect(out.verify_url).toBe(`/verify/sick-leave/${out.code}`);
    const row = w.data.medicalreports[0];
    expect(row).toMatchObject({ certificate_kind: 'sick_leave', status: 'issued', booking_ref: 'APT-0001', doctor_license_no: '12-R-34567', requested_by_patient: true, show_diagnosis: false, seha_ref: null });
    expect(row.doctor_specialty_en).toBeTruthy();
    expect(row.consultation_at).toEqual(CONSULT);
    expect(w.events.emit).toHaveBeenCalledWith('sick_leave.issued', expect.objectContaining({ serial: 'MED-2026-000001' }));
    // the second certificate gets the next serial
    w.data.appointments.push({ id: 'appt-2', patient_id: 'pat-1', doctor_user_id: 'doc-1', status: 'COMPLETED', slot_start: CONSULT });
    expect((await w.svc.issue(DOCTOR, 'appt-2', ISSUE)).serial).toBe('MED-2026-000002');
  });

  it('NO BACK-DATING: a start before the consultation day is refused and nothing is stored', async () => {
    const w = world();
    await expect(w.svc.issue(DOCTOR, 'appt-1', { ...ISSUE, start_date: '2026-11-08' })).rejects.toThrow('sick_leave_before_consultation');
    expect(w.data.medicalreports).toHaveLength(0);
  });

  it('needs a consultation of this doctor\'s, for this patient, that has started', async () => {
    const w = world();
    await expect(w.svc.issue({ ...DOCTOR, id: 'doc-2' }, 'appt-1', ISSUE)).rejects.toThrow('sick_leave_needs_consultation');
    await expect(w.svc.issue(DOCTOR, 'appt-1', { ...ISSUE, patient_id: 'pat-2' })).rejects.toThrow('sick_leave_needs_consultation');
    await expect(w.svc.issue(DOCTOR, 'new', ISSUE)).rejects.toThrow('sick_leave_needs_consultation');
    w.data.appointments[0].status = 'CONFIRMED';
    await expect(w.svc.issue(DOCTOR, 'appt-1', ISSUE)).rejects.toThrow('sick_leave_consultation_not_started');
    await expect(w.svc.issue(DOCTOR, 'appt-1', { ...ISSUE, patient_id: '' })).rejects.toThrow('patient_id required');
    await expect(w.svc.issue(DOCTOR, 'appt-1', { ...ISSUE, diagnosis: ' ' })).rejects.toThrow('diagnosis required');
    expect(w.data.medicalreports).toHaveLength(0);
  });

  it('a clash of the random verify code (the unique index refuses the insert) is retried with a new code, and gives up after five tries', async () => {
    const w = world();
    const real = w.conn.collection;
    let refuse = 2;
    w.conn.collection = (n: string) => {
      const c = real(n);
      if (n !== 'medicalreports') return c;
      return { ...c, insertOne: async (d: any) => { if (refuse-- > 0) throw Object.assign(new Error('dup'), { code: 11000 }); return c.insertOne(d); } };
    };
    const out = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    expect(out.code).toMatch(CODE_RE);
    expect(w.data.medicalreports).toHaveLength(1);
    refuse = 99;
    w.data.appointments.push({ id: 'appt-2', patient_id: 'pat-1', doctor_user_id: 'doc-1', status: 'COMPLETED', slot_start: CONSULT });
    await expect(w.svc.issue(DOCTOR, 'appt-2', ISSUE)).rejects.toMatchObject({ code: 11000 });
    expect(w.data.medicalreports).toHaveLength(1);
  });
});

describe('revoke', () => {
  it('the issuing doctor revokes with a reason; the certificate stays on record as revoked; a second revoke is a conflict; the audit trail has both events', async () => {
    const w = world();
    const issued = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    await expect(w.svc.revoke(DOCTOR, issued.serial, '  ')).rejects.toThrow('revoke_reason_required');
    const out = await w.svc.revoke(DOCTOR, issued.serial, 'issued on the wrong patient');
    expect(out).toMatchObject({ ok: true, status: 'revoked' });
    expect(w.data.medicalreports[0]).toMatchObject({ status: 'revoked', revoked_by: 'doc-1', revoke_reason: 'issued on the wrong patient' });
    await expect(w.svc.revoke(DOCTOR, issued.serial, 'again')).rejects.toBeInstanceOf(ConflictException);
    expect(w.events.emit).toHaveBeenCalledWith('sick_leave.revoked', expect.objectContaining({ serial: issued.serial }));
  });

  it('another doctor cannot revoke it (not found); an admin can', async () => {
    const w = world();
    const issued = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    await expect(w.svc.revoke({ id: 'doc-2', role: 'doctor' }, issued.id, 'x')).rejects.toBeInstanceOf(NotFoundException);
    expect((await w.svc.revoke({ id: 'admin-1', role: 'admin' }, issued.id, 'policy')).status).toBe('revoked');
  });
});

describe('the patient reads their own', () => {
  it('the list masks the ID number, the certificate shows it in full, and the diagnosis only when the doctor chose to show it', async () => {
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    const list = await w.svc.listForPatient('pat-1');
    expect(list).toHaveLength(1);
    expect(list[0].national_id).toBe('*******432');
    expect(list[0]).not.toHaveProperty('reason');
    const one = await w.svc.oneForPatient('pat-1', a.id);
    expect(one).toMatchObject({ national_id: '1098765432', patient_name: 'Sara Ahmed Ali', reason: 'Acute illness, rest advised', diagnosis: null, doctor_license_no: '12-R-34567' });
    w.data.appointments.push({ id: 'appt-2', patient_id: 'pat-1', doctor_user_id: 'doc-1', status: 'COMPLETED', slot_start: CONSULT });
    const b = await w.svc.issue(DOCTOR, 'appt-2', { ...ISSUE, show_diagnosis: true });
    expect((await w.svc.oneForPatient('pat-1', b.serial)).diagnosis).toBe('viral pharyngitis');
  });

  it('ANOTHER PATIENT gets 404 on the certificate, its serial and its PDF; their own list is empty', async () => {
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    await expect(w.svc.oneForPatient('pat-2', a.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(w.svc.oneForPatient('pat-2', a.serial)).rejects.toBeInstanceOf(NotFoundException);
    await expect(w.svc.pdfForPatient('pat-2', a.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(await w.svc.listForPatient('pat-2')).toEqual([]);
  });

  it('the PDF is a real PDF, for an issued and for a revoked certificate', async () => {
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    jest.useRealTimers();
    const issuedPdf = await w.svc.pdfForPatient('pat-1', a.id);
    expect(issuedPdf.subarray(0, 5).toString()).toBe('%PDF-');
    await w.svc.revoke(DOCTOR, a.id, 'withdrawn');
    const revokedPdf = await w.svc.pdfForPatient('pat-1', a.id);
    expect(revokedPdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(revokedPdf.length).toBeGreaterThan(1000);
  });
});

describe('the public verify page shows the minimum', () => {
  it('valid: initials, dates, days, serial, status. Never the name, the ID, the reason, the diagnosis or the doctor', async () => {
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', { ...ISSUE, show_diagnosis: true });
    const v: any = await w.svc.verify(a.code);
    expect(v).toMatchObject({ valid: true, status: 'issued', serial: a.serial, initials: 'S. A. A.', days: 3 });
    expect(new Date(v.from).toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(Object.keys(v).sort()).toEqual(['days', 'from', 'initials', 'issued_at', 'seha_registered', 'serial', 'status', 'to', 'valid']);
    const text = JSON.stringify(v);
    for (const secret of ['Sara Ahmed', '1098765432', 'Acute illness', 'viral', 'Sami', 'pat-1', 'doc-1']) expect(text).not.toContain(secret);
  });

  it('revoked: says so, with the time, and nothing more', async () => {
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    await w.svc.revoke(DOCTOR, a.id, 'withdrawn');
    const v: any = await w.svc.verify(a.code.toLowerCase());                 // the code is not case sensitive
    expect(v).toMatchObject({ valid: false, status: 'revoked' });
    expect(v.revoked_at).toBeTruthy();
    expect(JSON.stringify(v)).not.toContain('withdrawn');
  });

  it('an unknown or malformed code is 404 and never reaches the store as a query operator', async () => {
    const w = world();
    await expect(w.svc.verify('ABCDEFGH')).rejects.toBeInstanceOf(NotFoundException);
    for (const bad of ['', 'short', '{"$ne":1}', 'ABCDEFG0', 'ABCDEFGHI', undefined as any]) await expect(w.svc.verify(bad)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('renderSickLeavePdf', () => {
  it('draws without a QR and without optional fields', async () => {
    const buf = await renderSickLeavePdf({ cert: { serial: 'MED-2026-000009', status: 'issued', days: 1 }, qrPng: null, verifyUrl: 'https://nabd.plus/verify/sick-leave/ABCDEFGH' });
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});

describe('the request flag and the indexes', () => {
  it('the consultation booking accepts sick_leave_requested as a boolean only', async () => {
    const { plainToInstance } = require('class-transformer'); const { validate } = require('class-validator');
    const { CreateAppointmentDto } = require('../care/appointments.dto');
    const base = { doctor_id: 'd', service_type: 'clinic', slot_start: '2030-01-01T10:00:00Z' };
    const bad = async (v: unknown) => (await validate(plainToInstance(CreateAppointmentDto, { ...base, sick_leave_requested: v }))).filter((e: any) => e.property === 'sick_leave_requested').length;
    expect(await bad(true)).toBe(0);
    expect(await bad(undefined)).toBe(0);
    expect(await bad('yes')).toBeGreaterThan(0);
  });

  it('the unique indexes are partial, so other medical reports (no serial, no code) are untouched', async () => {
    const created: any[] = [];
    const conn: any = { collection: () => ({ createIndex: async (k: any, o: any) => { created.push([k, o]); } }) };
    await new SickLeaveService(conn).onModuleInit();
    expect(created.map((c) => [Object.keys(c[0])[0], c[1].unique, c[1].partialFilterExpression])).toEqual([
      ['serial', true, { serial: { $type: 'string' } }], ['verify_code', true, { verify_code: { $type: 'string' } }],
    ]);
  });
});

describe('the document is a medical report, never a "sick leave"', () => {
  it('the stored titles say medical report and a recommended rest period', async () => {
    const w = world();
    await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    const row = w.data.medicalreports[0];
    expect(row.title_ar).toBe('تقرير طبي: راحة موصى بها لمدة 3 أيام');
    expect(row.title_en).toBe('Medical report: 3-day recommended rest');
    expect(`${row.title_ar} ${row.title_en}`).not.toMatch(/إجازة مرضية|sick leave/i);
    expect(row.serial).toMatch(/^MED-2026-\d{6}$/);
  });

  it('the PDF source names the document "Medical report" and mentions Seha only in the official-leave footer and the Seha lines', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'sick-leave-pdf.ts'), 'utf8');
    const labels = src.slice(src.indexOf('const L = {'), src.indexOf('const dateOf'));
    expect(labels).toContain("en: 'Medical report'");
    expect(labels).toContain("en: 'Recommended rest period'");
    const uses = labels.split('\n').filter((l: string) => /sick leave|إجازة مرضية|الإجازات المرضية/i.test(l)).map((l: string) => l.trim().split(':')[0]);
    expect(uses.sort()).toEqual(['sehaFooter', 'sehaVerify']);
  });
});

describe('the Seha number (owner decision 2026-11-09)', () => {
  it('a new report is "pending" on Seha and the issuing doctor is told in the answer', async () => {
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    expect(a.seha_registration).toBe('pending');
    expect(await w.svc.oneForPatient('pat-1', a.id)).toMatchObject({ seha_status: 'pending', seha_number: null });
  });

  it('the issuing doctor adds the number: normalised, audit-logged with the old and the new value, the patient is notified, the report shows it', async () => {
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    const out = await w.svc.setSehaNumber(DOCTOR, a.serial, '  pgb-12345678 ');
    expect(out).toEqual({ ok: true, serial: a.serial, seha_status: 'registered', seha_number: 'PGB-12345678' });
    expect(w.notifications.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'pat-1', title_key: 'notif.medical_report.seha_added.title', params: expect.objectContaining({ seha_number: 'PGB-12345678' }) }));
    expect(w.events.emit).toHaveBeenCalledWith('sick_leave.seha_registered', expect.anything());
    expect(await w.svc.oneForPatient('pat-1', a.id)).toMatchObject({ seha_status: 'registered', seha_number: 'PGB-12345678' });
    const again = await w.svc.setSehaNumber(DOCTOR, a.serial, 'PGB-12345678');       // the same number: no second notification
    expect(again.ok).toBe(true);
    expect(w.notifications.create).toHaveBeenCalledTimes(1);
    await w.svc.setSehaNumber(DOCTOR, a.serial, 'PGB-87654321');                       // a correction: the patient is told again
    expect(w.notifications.create).toHaveBeenCalledTimes(2);
  });

  it('the shape is checked, and only the issuing doctor may set it (not another doctor, not an admin, not the patient)', async () => {
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    for (const bad of ['', 'abc', 'has space 123', 'x'.repeat(31), undefined, { $ne: 1 }]) await expect(w.svc.setSehaNumber(DOCTOR, a.id, bad)).rejects.toThrow('seha_number_invalid');
    await expect(w.svc.setSehaNumber({ id: 'doc-2', role: 'doctor' }, a.id, 'PGB-12345678')).rejects.toBeInstanceOf(NotFoundException);
    await expect(w.svc.setSehaNumber({ id: 'admin-1', role: 'admin' }, a.id, 'PGB-12345678')).rejects.toBeInstanceOf(NotFoundException);
    await expect(w.svc.setSehaNumber({ id: 'pat-1', role: 'patient' }, a.id, 'PGB-12345678')).rejects.toBeInstanceOf(NotFoundException);
    expect(w.data.medicalreports[0].seha_ref).toBeNull();
  });

  it('a revoked report cannot get a number', async () => {
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    await w.svc.revoke(DOCTOR, a.id, 'mistake');
    await expect(w.svc.setSehaNumber(DOCTOR, a.id, 'PGB-12345678')).rejects.toBeInstanceOf(ConflictException);
    expect(w.notifications.create).toHaveBeenCalledWith(expect.objectContaining({ title_key: 'notif.medical_report.revoked.title' }));
  });

  it('the public verify page says only whether a Seha number exists, never the number', async () => {
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    expect((await w.svc.verify(a.code) as any).seha_registered).toBe(false);
    await w.svc.setSehaNumber(DOCTOR, a.id, 'PGB-12345678');
    const v: any = await w.svc.verify(a.code);
    expect(v.seha_registered).toBe(true);
    expect(JSON.stringify(v)).not.toContain('PGB-12345678');
  });

  it('the PDF is still drawn with the number (pending and registered)', async () => {
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    jest.useRealTimers();
    expect((await w.svc.pdfForPatient('pat-1', a.id)).subarray(0, 5).toString()).toBe('%PDF-');
    await w.svc.setSehaNumber(DOCTOR, a.id, 'PGB-12345678');
    expect((await w.svc.pdfForPatient('pat-1', a.id)).subarray(0, 5).toString()).toBe('%PDF-');
  });
});

describe('reminders to the doctor and the admin list', () => {
  const H = 3600_000;
  it('one reminder after 24 h and one after 72 h, never repeated; none once the number is in, none for a revoked report', async () => {
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    const issuedAt = w.data.medicalreports[0].issued_at.getTime();
    expect(await w.svc.remindDoctors(new Date(issuedAt + 23 * H))).toBe(0);
    expect(await w.svc.remindDoctors(new Date(issuedAt + 25 * H))).toBe(1);
    expect(w.notifications.create).toHaveBeenLastCalledWith(expect.objectContaining({ user_id: 'doc-1', title_key: 'notif.medical_report.seha_reminder.title', params: { serial: a.serial, hours: 24 } }));
    expect(await w.svc.remindDoctors(new Date(issuedAt + 26 * H))).toBe(0);              // not repeated
    expect(await w.svc.remindDoctors(new Date(issuedAt + 73 * H))).toBe(1);
    expect(w.notifications.create).toHaveBeenLastCalledWith(expect.objectContaining({ params: { serial: a.serial, hours: 72 } }));
    expect(await w.svc.remindDoctors(new Date(issuedAt + 200 * H))).toBe(0);             // both sent
  });

  it('after a long stop only the 72 h reminder is sent (and the 24 h one is marked, so it never follows)', async () => {
    const w = world();
    await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    const issuedAt = w.data.medicalreports[0].issued_at.getTime();
    expect(await w.svc.remindDoctors(new Date(issuedAt + 100 * H))).toBe(1);
    expect(w.notifications.create).toHaveBeenCalledTimes(1);
    expect(await w.svc.remindDoctors(new Date(issuedAt + 101 * H))).toBe(0);
  });

  it('a registered or revoked report is not reminded', async () => {
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    await w.svc.setSehaNumber(DOCTOR, a.id, 'PGB-12345678');
    w.data.appointments.push({ id: 'appt-2', patient_id: 'pat-1', doctor_user_id: 'doc-1', status: 'COMPLETED', slot_start: CONSULT });
    const b = await w.svc.issue(DOCTOR, 'appt-2', ISSUE);
    await w.svc.revoke(DOCTOR, b.id, 'mistake');
    w.notifications.create.mockClear();
    expect(await w.svc.remindDoctors(new Date(NOW.getTime() + 100 * H))).toBe(0);
    expect(w.notifications.create).not.toHaveBeenCalled();
  });

  it('the admin list shows what is still without a number after 3 days, oldest first, with no patient data', async () => {
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    expect((await w.svc.listWithoutSeha(undefined, new Date(NOW.getTime() + 2 * 24 * H))).count).toBe(0);
    const list = await w.svc.listWithoutSeha(undefined, new Date(NOW.getTime() + 4 * 24 * H));
    expect(list).toMatchObject({ days: 3, count: 1 });
    expect(list.items[0]).toMatchObject({ serial: a.serial, doctor_id: 'doc-1', doctor_license_no: '12-R-34567', age_hours: 96 });
    const text = JSON.stringify(list);
    for (const secret of ['Sara', '1098765432', 'pat-1', 'viral']) expect(text).not.toContain(secret);
    await w.svc.setSehaNumber(DOCTOR, a.id, 'PGB-12345678');
    expect((await w.svc.listWithoutSeha(undefined, new Date(NOW.getTime() + 4 * 24 * H))).count).toBe(0);
  });
});

describe('audit log', () => {
  afterEach(() => registerAuditSink(null));
  it('issue, Seha number (old and new value) and revoke each write an audit row', async () => {
    const rows: any[] = [];
    registerAuditSink(async (e: any) => { rows.push(e); });
    const w = world();
    const a = await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    await w.svc.setSehaNumber(DOCTOR, a.id, 'PGB-12345678');
    await w.svc.setSehaNumber(DOCTOR, a.id, 'PGB-87654321');
    await w.svc.revoke(DOCTOR, a.id, 'mistake');
    expect(rows.map((r) => r.action)).toEqual(['sick_leave.issued', 'sick_leave.seha_number_set', 'sick_leave.seha_number_set', 'sick_leave.revoked']);
    expect(rows[1].details).toEqual({ previous: null, current: 'PGB-12345678' });
    expect(rows[2].details).toEqual({ previous: 'PGB-12345678', current: 'PGB-87654321' });
    expect(rows[3].details).toEqual({ reason: 'mistake' });
    expect(rows.every((r) => r.user_id === 'doc-1' && r.resource_id === a.serial)).toBe(true);
  });
});


describe('national ID (owner decision 6): asked only for a medical report, stored encrypted', () => {
  const saved = process.env.FIELD_ENCRYPTION_KEY;
  beforeAll(() => { process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64'); resetFieldCrypto(); });
  afterAll(() => { if (saved === undefined) delete process.env.FIELD_ENCRYPTION_KEY; else process.env.FIELD_ENCRYPTION_KEY = saved; resetFieldCrypto(); });
  const VALID = '1098765439'; // passes the check digit
  it('validates length, first digit and the check digit; Arabic digits are accepted', () => {
    expect(normaliseNationalId(VALID)).toBe(VALID);
    expect(normaliseNationalId('١٠٩٨٧٦٥٤٣٩')).toBe(VALID);
    for (const bad of ['', '123', '3098765431', '1098765432', 'abcdefghij', undefined, 12345678901]) expect(() => normaliseNationalId(bad)).toThrow('national_id_invalid');
  });
  it('saving stores ciphertext, status shows it masked, an invalid number is refused', async () => {
    const w = world();
    w.data.users[0].national_id = undefined;
    expect(await w.svc.nationalIdStatus('pat-1')).toEqual({ has_national_id: false, national_id: null });
    await expect(w.svc.setNationalId('pat-1', '1234567890')).rejects.toThrow('national_id_invalid');
    expect(await w.svc.setNationalId('pat-1', VALID)).toEqual({ has_national_id: true, national_id: '*******439' });
    expect(w.data.patient_identity).toHaveLength(1);
    expect(JSON.stringify(w.data.patient_identity[0])).not.toContain(VALID);
    expect(await w.svc.nationalIdStatus('pat-1')).toEqual({ has_national_id: true, national_id: '*******439' });
  });
  it('a report issued without the number asks for it before the PDF; after it is added the report shows it', async () => {
    const w = world();
    w.data.users[0].national_id = undefined;
    await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    const id = w.data.medicalreports[0].id;
    expect(w.data.medicalreports[0].patient_national_id ?? null).toBeNull();
    expect(await w.svc.oneForPatient('pat-1', id)).toMatchObject({ national_id: null, needs_national_id: true });
    expect((await w.svc.listForPatient('pat-1'))[0]).toMatchObject({ needs_national_id: true });
    await expect(w.svc.pdfForPatient('pat-1', id)).rejects.toThrow('national_id_required');
    await w.svc.setNationalId('pat-1', VALID);
    expect(await w.svc.oneForPatient('pat-1', id)).toMatchObject({ national_id: VALID, needs_national_id: false });
    expect((await w.svc.listForPatient('pat-1'))[0]).toMatchObject({ national_id: '*******439', needs_national_id: false });
  });
  it('a report issued when the number is already stored carries it (encrypted on the row)', async () => {
    const w = world();
    w.data.users[0].national_id = undefined;
    await w.svc.setNationalId('pat-1', VALID);
    await w.svc.issue(DOCTOR, 'appt-1', ISSUE);
    expect(JSON.stringify(w.data.medicalreports[0])).not.toContain(VALID);
    expect(await w.svc.oneForPatient('pat-1', w.data.medicalreports[0].id)).toMatchObject({ national_id: VALID });
  });
});
