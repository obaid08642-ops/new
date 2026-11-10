import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { recordAudit } from '../../common/audit-record';
import { NotificationType } from '../../common/enums';
import { LedgerService } from '../finance-engine/finance-engine.module';
import { NotificationsService } from '../notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { ScheduledOnce } from '../../common/scheduled-once';
import { AUTO_REFUND_WINDOW_DAYS, DISPUTE_REASON_MAX, DISPUTE_REASON_MIN, DISPUTE_WINDOW_HOURS, FLAG_REPORT_COUNT, FLAG_WINDOW_DAYS, clawbackAmount, disputeState, providerActivity, type ReportOutcome } from './provider-no-show-rules';

const COLLECTION = 'provider_no_show_reports';
/** A requested release that has not finished after this long is asked for again, at most this many times. */
const RELEASE_RETRY_AFTER_MIN = 15;
const MAX_RELEASE_ATTEMPTS = 5;

/**
 * The provider side of the patient's "the provider did not come" report: the check that the provider did nothing in the visit, the notice to the provider,
 * the 24-hour dispute with a reason, the admin's decision, the per-patient count and flag. The refund itself is AppointmentsService.reportProviderNoShow's.
 */
@Injectable()
export class ProviderNoShowService {
  private readonly logger = new Logger('ProviderNoShowService');
  constructor(
    @InjectConnection() private readonly conn: Connection,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly ledger?: LedgerService,
    @Optional() private readonly events?: EventEmitter2,
  ) {}

  private get reports() { return this.conn.collection(COLLECTION); }

  private async notify(userId: unknown, key: string, params: Record<string, unknown>, route: string): Promise<void> {
    if (!this.notifications || typeof userId !== 'string' || !userId) return;
    try {
      await this.notifications.create({ user_id: userId, title_key: `${key}.title`, body_key: `${key}.body`, params, type: NotificationType.APPOINTMENT, action: { route } });
    } catch (e: any) { this.logger.warn(`notification ${key} not sent: ${e?.message}`); }
  }

  /** Any sign that the provider took part in this visit (a state move by the provider, a call they started, a message from the doctor). */
  async activityOf(appt: any): Promise<ReturnType<typeof providerActivity>> {
    const id = String(appt?.id || '');
    const calls = await this.conn.collection('callsessions').find({ appointment_id: id }, { projection: { _id: 0, caller_id: 1, provider_id: 1, status: 1 } }).limit(20).toArray();
    const threads = await this.conn.collection('chat_threads').find({ type: 'booking', booking_id: { $eq: id } }, { projection: { _id: 0, id: 1 } }).limit(5).toArray();
    const threadIds = threads.map((t: any) => t.id).filter(Boolean);
    const messages = threadIds.length
      ? await this.conn.collection('chat_messages').find({ thread_id: { $in: threadIds } }, { projection: { _id: 0, sender_id: 1, sender_role: 1, type: 1, is_deleted: 1 } }).limit(200).toArray()
      : [];
    return providerActivity({ doctorUserId: appt?.doctor_user_id, stateHistory: appt?.state_history, calls: calls as any[], messages: messages as any[] });
  }

  /** Refuses the report when the provider was active in the visit (the patient then cancels or the doctor/admin handles it; no automatic 100 %). */
  async assertNoProviderActivity(appt: any): Promise<void> {
    if (await this.activityOf(appt)) throw new BadRequestException('provider_activity_recorded');
  }

  /**
   * After the report went through: the row (what the dispute and the admin work on), the provider told at once, the patient's count in the last 30 days and the
   * admin flag at the second report. Never throws: the refund already happened.
   */
  /** How many automatic refunds this patient got for reported no-shows in the last 30 days (the cap is in provider-no-show-rules). */
  async autoRefundsInWindow(patientUserId: string, now: Date = new Date()): Promise<number> {
    const since = new Date(now.getTime() - AUTO_REFUND_WINDOW_DAYS * 86_400_000);
    // Owner decision 2026-11-10: the cap counts only AUTOMATIC video refunds (refunded at once, no admin decision). A clinic/home refund released after the 24 hours, an admin-upheld one and an admin `review_refunded` one do not count.
    return this.reports.countDocuments({ reported_by: patientUserId, outcome: 'refunded', service_type: 'video', decision: null, reported_at: { $gte: since } });
  }

  async record(appt: any, patientUserId: string, now: Date = new Date(), outcome: ReportOutcome = 'refunded'): Promise<{ flagged: boolean; recent_reports: number; refund_after: Date | null }> {
    const id = String(appt.id);
    try {
      const since = new Date(now.getTime() - FLAG_WINDOW_DAYS * 86_400_000);
      const before = await this.reports.countDocuments({ reported_by: patientUserId, reported_at: { $gte: since } });
      const recent = before + 1;
      const flagged = recent >= FLAG_REPORT_COUNT;
      await this.reports.updateOne(
        { appointment_id: id },
        { $setOnInsert: { id: `pnr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, appointment_id: id, patient_id: appt.patient_id, reported_by: patientUserId, doctor_user_id: appt.doctor_user_id ?? null, doctor_id: appt.doctor_id ?? null, reported_at: now, status: outcome === 'held' ? 'held' : outcome === 'pending_review' ? 'pending_review' : 'reported', outcome, refund_due_at: outcome === 'held' ? new Date(now.getTime() + DISPUTE_WINDOW_HOURS * 3600_000) : null, service_type: appt.service_type ?? null, dispute: null, decision: null, patient_recent_reports: recent, flagged_for_admin: flagged, refund_amount: Number(appt.total_price || 0) } },
        { upsert: true },
      );
      await this.notify(appt.doctor_user_id, 'notif.provider_no_show.reported', { hours: 24 }, `/requests/${id}`);
      await recordAudit(this.conn, { action: 'provider_no_show.reported', user_id: patientUserId, role: 'patient', resource_kind: 'appointment', resource_id: id, details: { recent_reports: recent, flagged } } as any);
      return { flagged, recent_reports: recent, refund_after: outcome === 'held' ? new Date(now.getTime() + DISPUTE_WINDOW_HOURS * 3600_000) : null };
    } catch (e: any) {
      this.logger.error(`provider no-show report row not stored for ${id}: ${e?.message}`);
      return { flagged: false, recent_reports: 0, refund_after: null };
    }
  }

  /** The provider's side: one dispute with a reason inside 24 hours of the report. Only the visit's own doctor. */
  async dispute(user: any, appointmentId: string, reasonRaw: unknown, now: Date = new Date()) {
    const row: any = await this.reports.findOne({ appointment_id: { $eq: String(appointmentId) } }, { projection: { _id: 0 } });
    if (!row || !user?.id || row.doctor_user_id !== String(user.id)) throw new NotFoundException('no_show_report_not_found');
    const reason = typeof reasonRaw === 'string' ? reasonRaw.trim() : '';
    if (reason.length < DISPUTE_REASON_MIN || reason.length > DISPUTE_REASON_MAX) throw new BadRequestException('dispute_reason_invalid');
    if (row.status === 'pending_review') throw new ConflictException('no_show_under_review');
    const state = disputeState(row, now);
    if (state === 'already_disputed') throw new ConflictException('no_show_already_disputed');
    if (state === 'decided') throw new ConflictException('no_show_already_decided');
    if (state === 'expired') throw new BadRequestException('no_show_dispute_window_closed');
    const res = await this.reports.updateOne({ appointment_id: row.appointment_id, status: { $in: ['reported', 'held'] }, dispute: null }, { $set: { status: 'disputed', dispute: { reason, opened_at: now, by_user_id: String(user.id) } } });
    if (!res.modifiedCount) throw new ConflictException('no_show_already_disputed');
    await recordAudit(this.conn, { action: 'provider_no_show.disputed', user_id: String(user.id), role: 'doctor', resource_kind: 'appointment', resource_id: row.appointment_id, details: { reason: reason.slice(0, 200) } } as any);
    return { ok: true, status: 'disputed' as const, appointment_id: row.appointment_id };
  }

  async listForDoctor(user: any): Promise<{ count: number; items: any[] }> {
    const items = await this.reports.find({ doctor_user_id: String(user?.id) }, { projection: { _id: 0, flagged_for_admin: 0, patient_recent_reports: 0, reported_by: 0 } }).sort({ reported_at: -1 }).limit(100).toArray();
    return { count: items.length, items };
  }

  /** Admin: the reports by state (default: disputed ones waiting for a decision), or only the flagged patients' reports. */
  async listForAdmin(query: { status?: string; flagged?: string }): Promise<{ count: number; items: any[] }> {
    const filter: any = {};
    if (query.flagged === 'true') filter.flagged_for_admin = true;
    else filter.status = ['reported', 'held', 'pending_review', 'disputed', 'upheld', 'dismissed', 'releasing', 'review_refunded', 'review_rejected', 'release_failed'].includes(String(query.status)) ? String(query.status) : 'disputed';
    const items = await this.reports.find(filter, { projection: { _id: 0 } }).sort({ reported_at: 1 }).limit(200).toArray();
    return { count: items.length, items };
  }

  /**
   * The admin decides a dispute. `uphold_report`: the patient was right; the provider's earning on this visit (if one was credited) is taken back through the
   * ledger as a provider_debit, never more than the available balance, so it never takes a balance below 0. `accept_dispute`: the provider was there; nothing
   * moves (the refund went to the patient's card and the report stays as a flag on the patient's count). Only a disputed report can be decided, once.
   */
  async decide(admin: any, appointmentId: string, decisionRaw: unknown, noteRaw: unknown) {
    const decision = decisionRaw === 'uphold_report' || decisionRaw === 'accept_dispute' ? decisionRaw : null;
    if (!decision) throw new BadRequestException('decision_invalid');
    const note = typeof noteRaw === 'string' ? noteRaw.trim().slice(0, DISPUTE_REASON_MAX) : '';
    if (note.length < DISPUTE_REASON_MIN) throw new BadRequestException('decision_note_required');
    const row: any = await this.reports.findOne({ appointment_id: { $eq: String(appointmentId) } }, { projection: { _id: 0 } });
    if (!row) throw new NotFoundException('no_show_report_not_found');
    if (row.status !== 'disputed') throw new ConflictException(row.status === 'reported' ? 'no_show_not_disputed' : 'no_show_already_decided');

    // Claim first (one atomic conditional update), then move money: two admins deciding at the same moment cannot both claw back.
    const claim = await this.reports.updateOne({ appointment_id: row.appointment_id, status: 'disputed' }, { $set: { status: 'deciding', deciding_by: String(admin?.id), deciding_at: new Date() } });
    if (!claim.modifiedCount) throw new ConflictException('no_show_already_decided');
    let clawed = 0;
    let clawNote: string | null = null;
    const status = decision === 'uphold_report' ? 'upheld' : 'dismissed';
    try {
      if (decision === 'uphold_report') {
        if (row.outcome === 'held') {
          // the refund was held (clinic / home): nothing has been paid yet, so there is nothing to claw back; the refund is released now (and the refund path takes its own share back from a credited earning)
          this.release(row);
          clawNote = 'refund_released';
        } else {
          const result = await this.clawBack(row, admin);
          clawed = result.amount; clawNote = result.note;
        }
      }
      await this.reports.updateOne({ appointment_id: row.appointment_id, status: 'deciding' }, { $set: { status, decision: { decision, note, by_user_id: String(admin?.id), at: new Date(), clawback_amount: clawed, clawback_note: clawNote }, ...(clawNote === 'refund_released' ? { release_requested_at: new Date() } : {}) } });
    } catch (e) {
      // the clawback failed before its ledger row: give the report back so the decision can be taken again (the ledger ref keeps a retry from taking twice)
      await this.reports.updateOne({ appointment_id: row.appointment_id, status: 'deciding' }, { $set: { status: 'disputed' } }).catch(() => undefined);
      throw e;
    }
    await recordAudit(this.conn, { action: 'provider_no_show.decided', user_id: String(admin?.id), role: admin?.role, resource_kind: 'appointment', resource_id: row.appointment_id, details: { decision, clawback_amount: clawed, note: note.slice(0, 200) } } as any);
    await this.notify(row.doctor_user_id, 'notif.provider_no_show.decided', { decision }, `/requests/${row.appointment_id}`);
    return { ok: true, status, clawback_amount: clawed, clawback_note: clawNote };
  }

  /** Asks the appointment side to pay the held refund now (AppointmentsService listens: it cancels the visit as a provider no-show, which refunds 100 %). */
  private release(row: any): void {
    this.events?.emit('provider_no_show.release', { appointment_id: row.appointment_id, patient_id: row.patient_id });
  }

  /** The appointment side paid the held refund: the report is now an ordinary refunded one (the provider can no longer dispute: the money moved). */
  async markRefunded(appointmentId: string): Promise<void> {
    await this.reports.updateOne({ appointment_id: String(appointmentId), status: { $in: ['releasing', 'deciding', 'upheld', 'review_refunded'] } }, { $set: { refunded_at: new Date(), outcome: 'refunded' } });
  }

  /** The held refund could not be paid (the visit was cancelled meanwhile, a payment problem): the report stays visible to the admin, never retried by itself. */
  async markReleaseFailed(appointmentId: string, why: string): Promise<void> {
    await this.reports.updateOne({ appointment_id: String(appointmentId), status: { $in: ['releasing', 'deciding', 'upheld', 'review_refunded'] } }, { $set: { status: 'release_failed', release_error: String(why).slice(0, 300), release_failed_at: new Date() } });
  }

  /**
   * Clinic and home reports hold their refund until the provider's 24 hours are over. Then, for each one nobody disputed: if the provider turned up in the meantime (any activity on the visit)
   * the report is dismissed; otherwise the refund is released (one atomic claim per report, so two workers cannot both release). Disputed reports wait for the admin.
   */
  @Cron('*/10 * * * *')
  @ScheduledOnce({ ttlMs: 5 * 60_000, holdMs: 60_000 })
  async releaseDueHeld(now: Date = new Date()): Promise<number> {
    const due: any[] = await this.reports.find({ status: 'held', refund_due_at: { $lte: now } }, { projection: { _id: 0 } }).limit(50).toArray();
    let released = 0;
    for (const row of due) {
      const appt: any = await this.conn.collection('appointments').findOne({ id: row.appointment_id }, { projection: { _id: 0, id: 1, doctor_user_id: 1, state_history: 1 } });
      const activity = appt ? await this.activityOf(appt) : null;
      if (activity) {
        await this.reports.updateOne({ appointment_id: row.appointment_id, status: 'held' }, { $set: { status: 'dismissed', decision: { decision: 'auto_dismissed_provider_activity', activity, at: now } } });
        continue;
      }
      const claim = await this.reports.updateOne({ appointment_id: row.appointment_id, status: 'held' }, { $set: { status: 'releasing', releasing_at: now, release_requested_at: now } });
      if (!claim.modifiedCount) continue;
      this.release(row);
      released += 1;
    }
    return released + (await this.retryStuckReleases(now));
  }

  /**
   * A release is only an in-process event: if the worker stopped before the appointment side ran it (or it threw before it could say why), the report would stay `releasing` (or
   * `upheld` / `review_refunded` with no `refunded_at`) forever and the patient would never be paid. So every run also asks again for the releases that were requested more than 15
   * minutes ago and never finished (the handler is idempotent). After 5 asks the report is marked `release_failed` for an admin to see.
   */
  async retryStuckReleases(now: Date = new Date()): Promise<number> {
    const stale = new Date(now.getTime() - RELEASE_RETRY_AFTER_MIN * 60_000);
    const stuck: any[] = await this.reports.find({ status: { $in: ['releasing', 'upheld', 'review_refunded'] }, refunded_at: null, release_requested_at: { $lte: stale } }, { projection: { _id: 0 } }).limit(50).toArray();
    let again = 0;
    for (const row of stuck) {
      if (Number(row.release_attempts || 0) >= MAX_RELEASE_ATTEMPTS) {
        await this.reports.updateOne({ appointment_id: row.appointment_id, refunded_at: null, status: { $in: ['releasing', 'upheld', 'review_refunded'] } }, { $set: { status: 'release_failed', release_error: 'release_attempts_exhausted', release_failed_at: now } });
        continue;
      }
      const claim = await this.reports.updateOne({ appointment_id: row.appointment_id, refunded_at: null, release_requested_at: row.release_requested_at }, { $set: { release_requested_at: now }, $inc: { release_attempts: 1 } });
      if (!claim.modifiedCount) continue;
      this.release(row);
      again += 1;
    }
    return again;
  }

  /**
   * The 3rd (and later) automatic video refund of one patient in 30 days waits for an admin: `refund` releases it, `reject` leaves the visit as it is. One claim per report.
   */
  async reviewPending(admin: any, appointmentId: string, decisionRaw: unknown, noteRaw: unknown) {
    const decision = decisionRaw === 'refund' || decisionRaw === 'reject' ? decisionRaw : null;
    if (!decision) throw new BadRequestException('decision_invalid');
    const note = typeof noteRaw === 'string' ? noteRaw.trim().slice(0, DISPUTE_REASON_MAX) : '';
    if (note.length < DISPUTE_REASON_MIN) throw new BadRequestException('decision_note_required');
    const row: any = await this.reports.findOne({ appointment_id: { $eq: String(appointmentId) } }, { projection: { _id: 0 } });
    if (!row) throw new NotFoundException('no_show_report_not_found');
    if (row.status !== 'pending_review') throw new ConflictException('no_show_not_pending_review');
    const status = decision === 'refund' ? 'review_refunded' : 'review_rejected';
    const res = await this.reports.updateOne({ appointment_id: row.appointment_id, status: 'pending_review' }, { $set: { status, decision: { decision, note, by_user_id: String(admin?.id), at: new Date() }, ...(decision === 'refund' ? { release_requested_at: new Date() } : {}) } });
    if (!res.modifiedCount) throw new ConflictException('no_show_not_pending_review');
    if (decision === 'refund') this.release(row);
    await recordAudit(this.conn, { action: 'provider_no_show.review', user_id: String(admin?.id), role: admin?.role, resource_kind: 'appointment', resource_id: row.appointment_id, details: { decision, note: note.slice(0, 200) } } as any);
    return { ok: true, status };
  }

  /** The provider's credited earning on the visit, taken back once (ref no-show-clawback-<appointment>) and capped at their available balance. */
  private async clawBack(row: any, admin: any): Promise<{ amount: number; note: string | null }> {
    if (!this.ledger) return { amount: 0, note: 'ledger_unavailable' };
    const col = this.conn.collection('platformledgerentries');
    const earning: any = await col.findOne({ type: 'provider_earning', order_id: row.appointment_id }, { projection: { _id: 0, amount: 1, provider_account_id: 1 } });
    if (!earning || !earning.provider_account_id) return { amount: 0, note: 'no_earning_credited' };
    const ref = `no-show-clawback-${row.appointment_id}`;
    if (await this.ledger.exists('provider_debit', 'no_show', ref)) return { amount: 0, note: 'already_clawed_back' };
    const balance = await this.ledger.providerBalance(String(earning.provider_account_id));
    const amount = clawbackAmount(Number(earning.amount), Number(balance.available));
    if (amount <= 0) return { amount: 0, note: 'no_available_balance' };
    await this.ledger.append({
      type: 'provider_debit', amount, provider_account_id: String(earning.provider_account_id), ref_type: 'no_show', ref_id: ref, order_id: row.appointment_id,
      description: `Provider no-show upheld by admin: earning on appointment ${row.appointment_id} taken back (never below 0)`, actor_id: String(admin?.id),
    });
    return { amount, note: amount < Number(earning.amount) ? 'capped_at_available_balance' : null };
  }
}
