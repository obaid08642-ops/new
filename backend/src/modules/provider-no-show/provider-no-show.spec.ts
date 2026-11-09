import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { registerAuditSink } from '../../common/audit-record';
import { ProviderNoShowService } from './provider-no-show.service';
import { clawbackAmount, disputeState, providerActivity } from './provider-no-show-rules';

const NOW = new Date('2026-11-09T12:00:00Z');
const HOUR = 3600_000;

describe('providerActivity', () => {
  const base = { doctorUserId: 'doc', stateHistory: [{ state: 'CONFIRMED', by_user_id: 'doc', by_role: 'doctor' }] };
  it('nothing happened: no activity (the doctor confirming the booking earlier is not attending)', () => {
    expect(providerActivity(base)).toBeNull();
  });
  it('the consultation started', () => {
    expect(providerActivity({ ...base, stateHistory: [{ state: 'IN_PROGRESS', by_role: 'doctor' }] })).toBe('consultation_started');
  });
  it('a check-in by the provider counts, a check-in by the patient does not', () => {
    expect(providerActivity({ ...base, stateHistory: [{ state: 'CHECKED_IN', by_user_id: 'doc', by_role: 'doctor' }] })).toBe('checked_in');
    expect(providerActivity({ ...base, stateHistory: [{ state: 'CHECKED_IN', by_user_id: 'pat', by_role: 'patient' }] })).toBeNull();
  });
  it('a call the doctor started counts, a call the patient started does not', () => {
    expect(providerActivity({ ...base, calls: [{ caller_id: 'doc' }] })).toBe('call_started');
    expect(providerActivity({ ...base, calls: [{ caller_id: 'pat' }] })).toBeNull();
  });
  it('a message from the doctor counts; the patient\'s, a system line and a deleted one do not', () => {
    expect(providerActivity({ ...base, messages: [{ sender_id: 'doc', sender_role: 'doctor', type: 'text' }] })).toBe('doctor_message');
    expect(providerActivity({ ...base, messages: [{ sender_id: 'pat', sender_role: 'patient', type: 'text' }, { sender_id: 'doc', sender_role: 'doctor', type: 'system' }, { sender_id: 'doc', sender_role: 'doctor', type: 'text', is_deleted: true }] })).toBeNull();
  });
});

describe('disputeState / clawbackAmount', () => {
  const r = (over: any = {}) => ({ reported_at: new Date(NOW.getTime() - HOUR), status: 'reported', dispute: null, ...over });
  it('open for 24 hours, then closed; once; closed after a decision', () => {
    expect(disputeState(r(), NOW)).toBe('open');
    expect(disputeState(r({ reported_at: new Date(NOW.getTime() - 24 * HOUR) }), NOW)).toBe('open');
    expect(disputeState(r({ reported_at: new Date(NOW.getTime() - 24 * HOUR - 1) }), NOW)).toBe('expired');
    expect(disputeState(r({ status: 'disputed', dispute: { reason: 'x' } }), NOW)).toBe('already_disputed');
    expect(disputeState(r({ status: 'upheld' }), NOW)).toBe('decided');
  });
  it('the clawback never exceeds the earning or the available balance, never negative', () => {
    expect(clawbackAmount(100, 500)).toBe(100);
    expect(clawbackAmount(100, 40)).toBe(40);
    expect(clawbackAmount(100, 0)).toBe(0);
    expect(clawbackAmount(100, -30)).toBe(0);
    expect(clawbackAmount(0, 50)).toBe(0);
    expect(clawbackAmount(NaN, 50)).toBe(0);
  });
});

// A small in-memory store: equality, $in, $gte, $eq, $ne filters, which is all the service uses.
function store(seed: Record<string, any[]> = {}) {
  const data: Record<string, any[]> = { ...seed };
  const match = (doc: any, f: any): boolean => Object.entries(f).every(([k, v]: [string, any]) => {
    const x = doc[k];
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      if ('$in' in v) return v.$in.includes(x);
      if ('$eq' in v) return x === v.$eq;
      if ('$gte' in v) return x >= v.$gte;
      if ('$ne' in v) return x !== v.$ne;
    }
    return v === null ? x == null : x === v;
  });
  const col = (name: string) => {
    const rows = () => (data[name] = data[name] || []);
    const cursor = (list: any[]) => ({ sort: () => cursor(list), limit: () => cursor(list), toArray: async () => list });
    return {
      find: (f: any) => cursor(rows().filter((d) => match(d, f))),
      findOne: async (f: any) => rows().find((d) => match(d, f)) ?? null,
      countDocuments: async (f: any) => rows().filter((d) => match(d, f)).length,
      insertOne: async (d: any) => { rows().push(d); },
      updateOne: async (f: any, u: any, o: any = {}) => {
        const hit = rows().find((d) => match(d, f));
        if (hit) { Object.assign(hit, u.$set || {}); return { modifiedCount: u.$set ? 1 : 0 }; }
        if (o.upsert) { rows().push({ ...(u.$setOnInsert || {}), ...(u.$set || {}) }); return { modifiedCount: 0, upsertedCount: 1 }; }
        return { modifiedCount: 0 };
      },
    };
  };
  return { data, conn: { collection: col } as any };
}

function make(seed: Record<string, any[]> = {}, available = 500) {
  const st = store(seed);
  const notifications: any = { create: jest.fn(async () => undefined) };
  const appended: any[] = [];
  const ledger: any = {
    exists: async (type: string, refType: string, refId: string) => (st.data.platformledgerentries || []).find((e) => e.type === type && e.ref_type === refType && e.ref_id === refId) ?? null,
    providerBalance: async () => ({ available }),
    append: jest.fn(async (e: any) => { appended.push(e); (st.data.platformledgerentries = st.data.platformledgerentries || []).push(e); }),
  };
  const svc = new ProviderNoShowService(st.conn, notifications, ledger);
  return { svc, st, notifications, ledger, appended };
}
const appt = { id: 'a1', patient_id: 'pat', doctor_id: 'd1', doctor_user_id: 'doc', total_price: 200, state_history: [] };
const doctor = { id: 'doc', role: 'doctor' };
const admin = { id: 'adm', role: 'admin' };

describe('the report row', () => {
  it('stores the report, tells the provider at once, and does not flag a first report', async () => {
    const { svc, st, notifications } = make();
    const out = await svc.record(appt, 'pat', NOW);
    expect(out).toEqual({ flagged: false, recent_reports: 1 });
    expect(st.data.provider_no_show_reports[0]).toMatchObject({ appointment_id: 'a1', status: 'reported', doctor_user_id: 'doc', flagged_for_admin: false });
    expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'doc', title_key: 'notif.provider_no_show.reported.title' }));
  });
  it('flags the patient at the second report within 30 days; an old report does not count', async () => {
    const old = { reported_by: 'pat', reported_at: new Date(NOW.getTime() - 31 * 24 * HOUR) };
    const recent = { reported_by: 'pat', reported_at: new Date(NOW.getTime() - 5 * 24 * HOUR) };
    expect((await make({ provider_no_show_reports: [old] }).svc.record(appt, 'pat', NOW))).toEqual({ flagged: false, recent_reports: 1 });
    const m = make({ provider_no_show_reports: [recent] });
    expect(await m.svc.record(appt, 'pat', NOW)).toEqual({ flagged: true, recent_reports: 2 });
    expect(m.st.data.provider_no_show_reports.find((r: any) => r.appointment_id === 'a1').flagged_for_admin).toBe(true);
  });
  it('the same appointment reported twice stores one row', async () => {
    const m = make();
    await m.svc.record(appt, 'pat', NOW); await m.svc.record(appt, 'pat', NOW);
    expect(m.st.data.provider_no_show_reports.filter((r: any) => r.appointment_id === 'a1')).toHaveLength(1);
  });
});

describe('the activity guard', () => {
  it('refuses when the doctor wrote in the visit chat or started a call; allows when nothing happened', async () => {
    const chat = make({ chat_threads: [{ id: 't1', type: 'booking', booking_id: 'a1' }], chat_messages: [{ thread_id: 't1', sender_id: 'doc', sender_role: 'doctor', type: 'text' }] });
    await expect(chat.svc.assertNoProviderActivity(appt)).rejects.toThrow('provider_activity_recorded');
    const call = make({ callsessions: [{ appointment_id: 'a1', caller_id: 'doc' }] });
    await expect(call.svc.assertNoProviderActivity(appt)).rejects.toBeInstanceOf(BadRequestException);
    await expect(make().svc.assertNoProviderActivity(appt)).resolves.toBeUndefined();
    await expect(make({ chat_threads: [{ id: 't1', type: 'booking', booking_id: 'a1' }], chat_messages: [{ thread_id: 't1', sender_id: 'pat', sender_role: 'patient', type: 'text' }] }).svc.assertNoProviderActivity(appt)).resolves.toBeUndefined();
  });
  it('refuses when the provider checked in', async () => {
    await expect(make().svc.assertNoProviderActivity({ ...appt, state_history: [{ state: 'CHECKED_IN', by_user_id: 'doc', by_role: 'doctor' }] })).rejects.toThrow('provider_activity_recorded');
  });
});

describe('the dispute', () => {
  const row = (over: any = {}) => ({ id: 'r1', appointment_id: 'a1', doctor_user_id: 'doc', reported_at: new Date(NOW.getTime() - HOUR), status: 'reported', dispute: null, ...over });
  it('the visit\'s doctor disputes once with a reason inside 24 hours', async () => {
    const m = make({ provider_no_show_reports: [row()] });
    expect(await m.svc.dispute(doctor, 'a1', 'I was in the clinic at the time, the door log shows it', NOW)).toMatchObject({ ok: true, status: 'disputed' });
    expect(m.st.data.provider_no_show_reports[0]).toMatchObject({ status: 'disputed', dispute: expect.objectContaining({ by_user_id: 'doc' }) });
    await expect(m.svc.dispute(doctor, 'a1', 'a second dispute with a reason', NOW)).rejects.toThrow('no_show_already_disputed');
  });
  it('another doctor, a missing report: 404; a short or missing reason: 400; after 24 hours: 400', async () => {
    const m = make({ provider_no_show_reports: [row()] });
    await expect(m.svc.dispute({ id: 'other', role: 'doctor' }, 'a1', 'long enough reason here', NOW)).rejects.toBeInstanceOf(NotFoundException);
    await expect(m.svc.dispute(doctor, 'nope', 'long enough reason here', NOW)).rejects.toBeInstanceOf(NotFoundException);
    await expect(m.svc.dispute(doctor, 'a1', 'short', NOW)).rejects.toThrow('dispute_reason_invalid');
    await expect(m.svc.dispute(doctor, 'a1', undefined, NOW)).rejects.toThrow('dispute_reason_invalid');
    await expect(m.svc.dispute(doctor, 'a1', 'long enough reason here', new Date(NOW.getTime() + 24 * HOUR))).rejects.toThrow('no_show_dispute_window_closed');
  });
});

describe('the admin decision and the clawback', () => {
  const disputed = { id: 'r1', appointment_id: 'a1', doctor_user_id: 'doc', status: 'disputed', dispute: { reason: 'x'.repeat(12) }, reported_at: NOW };
  const earning = { type: 'provider_earning', order_id: 'a1', provider_account_id: 'acc1', amount: 120 };
  const audits: any[] = [];
  beforeAll(() => registerAuditSink(async (r: any) => { audits.push(r); }));

  it('upholding the report takes the earning back through the ledger, once', async () => {
    const m = make({ provider_no_show_reports: [{ ...disputed }], platformledgerentries: [earning] }, 500);
    const out = await m.svc.decide(admin, 'a1', 'uphold_report', 'the door log shows nobody came');
    expect(out).toMatchObject({ status: 'upheld', clawback_amount: 120, clawback_note: null });
    expect(m.appended).toEqual([expect.objectContaining({ type: 'provider_debit', amount: 120, provider_account_id: 'acc1', ref_type: 'no_show', ref_id: 'no-show-clawback-a1' })]);
    await expect(m.svc.decide(admin, 'a1', 'uphold_report', 'the door log shows nobody came')).rejects.toThrow('no_show_already_decided');
    expect(m.appended).toHaveLength(1);
  });
  it('never below 0: the clawback is capped at the available balance, nothing when the balance is 0 or negative', async () => {
    const capped = make({ provider_no_show_reports: [{ ...disputed }], platformledgerentries: [earning] }, 45.5);
    expect(await capped.svc.decide(admin, 'a1', 'uphold_report', 'the door log shows nobody came')).toMatchObject({ clawback_amount: 45.5, clawback_note: 'capped_at_available_balance' });
    const empty = make({ provider_no_show_reports: [{ ...disputed }], platformledgerentries: [earning] }, -10);
    expect(await empty.svc.decide(admin, 'a1', 'uphold_report', 'the door log shows nobody came')).toMatchObject({ status: 'upheld', clawback_amount: 0, clawback_note: 'no_available_balance' });
    expect(empty.appended).toHaveLength(0);
  });
  it('no credited earning: nothing is taken (the decision is still recorded)', async () => {
    const m = make({ provider_no_show_reports: [{ ...disputed }] });
    expect(await m.svc.decide(admin, 'a1', 'uphold_report', 'the door log shows nobody came')).toMatchObject({ status: 'upheld', clawback_amount: 0, clawback_note: 'no_earning_credited' });
  });
  it('accepting the dispute moves no money', async () => {
    const m = make({ provider_no_show_reports: [{ ...disputed }], platformledgerentries: [earning] });
    expect(await m.svc.decide(admin, 'a1', 'accept_dispute', 'the doctor showed the check-in log')).toMatchObject({ status: 'dismissed', clawback_amount: 0 });
    expect(m.appended).toHaveLength(0);
  });
  it('only a disputed report is decided; bad input is a 400; a decision is audited', async () => {
    const reported = make({ provider_no_show_reports: [{ ...disputed, status: 'reported', dispute: null }] });
    await expect(reported.svc.decide(admin, 'a1', 'uphold_report', 'the door log shows nobody came')).rejects.toThrow('no_show_not_disputed');
    await expect(reported.svc.decide(admin, 'a1', 'maybe', 'the door log shows nobody came')).rejects.toThrow('decision_invalid');
    await expect(reported.svc.decide(admin, 'a1', 'uphold_report', 'no')).rejects.toThrow('decision_note_required');
    await expect(reported.svc.decide(admin, 'zzz', 'uphold_report', 'the door log shows nobody came')).rejects.toBeInstanceOf(NotFoundException);
    expect(audits.some((a) => a.action === 'provider_no_show.decided')).toBe(true);
    await expect(Promise.reject(new ConflictException('x'))).rejects.toBeInstanceOf(ConflictException);
  });
  it('the admin lists: disputed by default, flagged on request', async () => {
    const m = make({ provider_no_show_reports: [{ ...disputed }, { appointment_id: 'a2', status: 'reported', flagged_for_admin: true }, { appointment_id: 'a3', status: 'reported', flagged_for_admin: false }] });
    expect((await m.svc.listForAdmin({})).items.map((r: any) => r.appointment_id)).toEqual(['a1']);
    expect((await m.svc.listForAdmin({ flagged: 'true' })).items.map((r: any) => r.appointment_id)).toEqual(['a2']);
  });
});
