import { protectHealthDoc } from '../../common/health-fields';
import { PROVIDER_ROLES } from '../../common/enums';
import { escapeRegex } from '../../common/slug.util';
import { recordAudit } from '../../common/audit-record';
/**
 * Provider Operations module — fills the remaining workflow gaps per provider type:
 *
 *  DOCTOR:    vacation/leave management, prescription templates, saved diagnoses,
 *             patient blacklist, emergency closing for a day.
 *  LAB:       QC states (sample rejected/recollect), urgent/STAT priority,
 *             critical values with doctor+patient notification, double verification.
 *  NURSING:   visit checklists (before/supplies/after), patient signature on
 *             completion, GPS track points, emergency escalation.
 *  FINANCE:   invoice PDF per order, wallet ledger transactions for providers.
 */
import { Module, Injectable, Controller, Get, Post, Put, Delete, Body, Param, Query, Res, UseGuards, BadRequestException, ForbiddenException, NotFoundException, StreamableFile, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Schema } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { JwtAuthGuard, CurrentUser, Roles, hasEffectiveRole } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { AddLeaveDto, SaveTemplateDto, SaveDxDto, BlockDto, PutCrmDto, QcDto, ChecklistDto, SignDto, TrackDto, EscalateDto, PutPricingDto, PutTariffsDto, ReplyReviewDto, PutHoursDto, EndConsultationDto, ScheduleSettingsDto, ToggleInstantDto } from './provider-ops.dto';
import { CommissionResolver, LedgerService } from '../finance-engine/finance-engine.module';
import { settlementDelayDefault } from '../../common/commission-defaults';

/** Provider withdrawal requests (consumed by admin-web-core finance controller). */
export const ProviderWithdrawalSchema = new Schema(
  {
    id: { type: String, index: true, unique: true },
    provider_id: { type: String, index: true },
    amount: Number,
    state: { type: String, default: 'PENDING_ADMIN_APPROVAL', index: true },
    iban: String,
    bank_name: String,
    reference: String,
    decided_by: String,
    decided_at: Date,
    reject_reason: String,
  },
  { timestamps: true, collection: 'providerwithdrawals', strict: false },
);

/**
 * What the provider's own price lines of a completed booking come to, from the booking's own fields: the consultation fee
 * (`price`, not the platform service fee, home-visit and transport fees on top of it), a lab or radiology service total
 * without the home fee, a nursing total (unit price x sessions). 0 when the booking carries no such figure.
 */
export function providerOwnAmount(kind: string, booking: any): number {
  const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : 0; };
  const round2 = (x: number) => Math.round(x * 100) / 100;
  if (kind === 'consultation') return round2(n(booking?.price));
  if (kind === 'lab' || kind === 'radiology') {
    const gross = n(booking?.total_price) || n(booking?.total);
    return round2(n(booking?.service_fee) || Math.max(0, gross - n(booking?.home_visit_fee)));
  }
  return round2(n(booking?.total) || n(booking?.total_price));
}

@Injectable()
export class ProviderOpsService {
  private readonly logger = new Logger(ProviderOpsService.name);

  constructor(@InjectConnection() private readonly conn: Connection) {}

  /**
   * LJ-09: one place credits earnings — on the governed `service.completed`
   * event. Resolves the booking, its provider account, and the collected
   * amount (paid transactions, paid/covered booking total, or cash proof),
   * then credits one canonical ref_type per domain, idempotent per booking.
   */
  @OnEvent('service.completed')
  async creditCompletedService(event: any): Promise<void> {
    const domains: Record<string, { collection: string; kind: string; service: string; providerFields: string[] }> = {
      appointment: { collection: 'appointments', kind: 'consultation', service: 'doctor', providerFields: ['doctor_user_id'] },
      lab_booking: { collection: 'labbookings', kind: 'lab', service: 'lab', providerFields: ['lab_id', 'facility_id', 'provider_account_id'] },
      radiology_booking: { collection: 'radiologybookings', kind: 'radiology', service: 'radiology', providerFields: ['radiology_center_id', 'provider_id', 'provider_account_id'] },
      nursing_booking: { collection: 'homecarebookings', kind: 'nursing', service: 'nursing', providerFields: ['provider_id', 'nurse_id', 'provider_account_id'] },
    };
    const domain = domains[String(event?.entity_type || '')];
    const bookingId = String(event?.entity_id || '');
    if (!domain || !bookingId) return;

    try {
      const booking: any = await this.conn.collection(domain.collection).findOne({ id: bookingId });
      if (!booking) return this.earningSkipped('booking_not_found', domain.kind, bookingId);

      const providerId = domain.providerFields.map((field) => booking[field]).find(Boolean);
      if (!providerId) return this.earningSkipped('no_provider_on_booking', domain.kind, bookingId);

      const paidTransactions = await this.conn.collection('transactions').find(
        { booking_kind: domain.kind, booking_id: bookingId, status: 'paid' },
        { projection: { amount: 1, _id: 0 } },
      ).toArray();
      const transactionTotal = paidTransactions.reduce((sum: number, transaction: any) => sum + Number(transaction.amount || 0), 0);
      const paymentState = String(booking.payment_status || '').toLowerCase();
      const collected = Number(booking.collection_proof?.amount_collected || 0)
        || (['paid', 'covered_by_insurance'].includes(paymentState)
          ? Number(booking.total_price ?? booking.total ?? booking.price ?? 0) || transactionTotal
          : transactionTotal);
      if (!(collected > 0)) return this.earningSkipped('nothing_collected', domain.kind, bookingId, { payment_status: paymentState || null });
      // The patient also paid the platform's own lines (service fee, home-visit and transport fees): those are not the
      // provider's, so neither the credit nor the commission is taken on them. A co-pay below the provider's price stays as paid.
      const own = providerOwnAmount(domain.kind, booking);
      const gross = own > 0 ? Math.min(collected, own) : collected;

      const account: any = await this.conn.collection('provider_accounts').findOne({
        $or: [{ id: String(providerId) }, { user_id: String(providerId) }],
      });
      const providerAccountId = account?.id || account?.user_id;
      if (!providerAccountId) return this.earningSkipped('no_provider_account', domain.kind, bookingId, { provider_ref: String(providerId) });

      await this.creditEarning(providerAccountId, domain.service, gross, domain.kind === 'nursing' ? 'homecare_booking' : domain.kind === 'consultation' ? 'appointment' : `${domain.kind}_booking`, bookingId, { paymentMethod: booking.payment_method });
    } catch (error: any) {
      this.logger.error(`provider_earning_credit_failed booking=${bookingId}: ${error?.message || error}`);
    }
  }

  /** A completed service that credits nothing is said so: a warning in the log and an audit row, so finance can find the booking (it used to return silently). */
  private async earningSkipped(reason: string, kind: string, bookingId: string, extra: Record<string, unknown> = {}): Promise<void> {
    this.logger.warn(`provider_earning_skipped reason=${reason} kind=${kind} booking=${bookingId}`);
    try {
      await recordAudit(this.conn, { action: 'provider_earning.skipped', user_id: 'system', role: 'system', resource_kind: `${kind}_booking`, resource_id: bookingId, details: { reason, ...extra } } as never);
    } catch { /* the trail must not fail the completion event */ }
  }

  // ═══ DOCTOR: vacation / leave management ═════════════════════════════════
  async addLeave(doctorId: string, body: { start_date: string; end_date: string; type: string; note?: string }) {
    if (!body?.start_date || !body?.end_date) throw new BadRequestException('start_date and end_date required');
    const start = new Date(body.start_date);
    const end = new Date(body.end_date);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) throw new BadRequestException('invalid date range');
    const doc = {
      id: `leave_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      doctor_id: doctorId,
      start_date: start,
      end_date: end,
      type: ['vacation', 'leave', 'break', 'emergency_closing'].includes(body.type) ? body.type : 'leave',
      note: body.note || null,
      status: 'active',
      createdAt: new Date(),
    };
    // A doctor linked to a facility asks the facility first (FacilityLeaveRequestsScreen approves/rejects);
    // the leave blocks bookings once approved.
    const acc: any = await this.conn.collection('provider_accounts').findOne({ $or: [{ id: doctorId }, { user_id: doctorId }] }, { projection: { facility_id: 1, email: 1 } });
    if (acc?.facility_id) {
      doc.status = 'pending_facility';
      const prof: any = await this.conn.collection('provider_profiles').findOne({ account_id: doctorId }, { projection: { display_name_ar: 1, display_name_en: 1 } });
      const LEAVE_TYPE: Record<string, string> = { vacation: 'vacation', emergency_closing: 'emergency', leave: 'other', break: 'other' };
      await this.conn.collection('leaverequests').insertOne({
        id: doc.id, facility_id: acc.facility_id, provider_account_id: doctorId, provider_name: prof?.display_name_ar || prof?.display_name_en || acc.email,
        provider_type: 'doctor', type: LEAVE_TYPE[doc.type] || 'other', start_date: start, end_date: end, reason: doc.note || undefined,
        status: 'pending', createdAt: new Date(), updatedAt: new Date(),
      });
    }
    await this.conn.collection('doctor_leaves').insertOne(doc);
    return { ok: true, leave: doc };
  }

  async myLeaves(doctorId: string): Promise<any[]> {
    return this.conn.collection('doctor_leaves').find({ doctor_id: doctorId, status: { $in: ['active', 'pending_facility'] } }).sort({ start_date: 1 }).limit(50).toArray();
  }

  async cancelLeave(doctorId: string, leaveId: string) {
    await this.conn.collection('doctor_leaves').updateOne(
      { id: leaveId, doctor_id: doctorId },
      { $set: { status: 'cancelled', updatedAt: new Date() } },
    );
    // withdrawn before the facility decided: drop it from the facility queue
    await this.conn.collection('leaverequests').deleteOne({ id: leaveId, provider_account_id: doctorId, status: 'pending' });
    return { ok: true };
  }

  /** Booking guard: is the doctor on leave at this time? (used by booking flow) */
  async isOnLeave(doctorId: string, when: Date): Promise<boolean> {
    const hit = await this.conn.collection('doctor_leaves').findOne({
      doctor_id: doctorId,
      status: 'active',
      start_date: { $lte: when },
      end_date: { $gte: when },
    });
    return !!hit;
  }

  // ═══ DOCTOR: prescription templates / saved diagnoses / blacklist ════════
  async saveTemplate(doctorId: string, body: { name: string; items: any[]; notes?: string }) {
    if (!body?.name || !Array.isArray(body?.items) || !body.items.length) throw new BadRequestException('name and items required');
    const doc = { id: `tpl_${Date.now()}`, doctor_id: doctorId, name: body.name, items: body.items, notes: body.notes || null, usage_count: 0, createdAt: new Date() };
    await this.conn.collection('prescription_templates').insertOne(doc);
    return { ok: true, template: doc };
  }

  async myTemplates(doctorId: string): Promise<any[]> {
    return this.conn.collection('prescription_templates').find({ doctor_id: doctorId }).sort({ usage_count: -1, createdAt: -1 }).limit(50).toArray();
  }

  /**
   * The doctor applied a saved template to the prescription being written: count the use (the list is
   * ordered by usage_count) and hand back the doctor's own template so the screen fills the form from it.
   */
  async useTemplate(doctorId: string, id: string): Promise<any> {
    const now = new Date();
    const doc = await this.conn.collection('prescription_templates').findOneAndUpdate(
      { id: { $eq: id }, doctor_id: { $eq: doctorId } },
      { $inc: { usage_count: 1 }, $set: { last_used_at: now } },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
    if (!doc) throw new NotFoundException('template not found');
    return doc;
  }

  async deleteTemplate(doctorId: string, id: string) {
    await this.conn.collection('prescription_templates').deleteOne({ id, doctor_id: doctorId });
    return { ok: true };
  }

  async saveDiagnosis(doctorId: string, body: { name_ar: string; name_en?: string; icd?: string; notes?: string }) {
    if (!body?.name_ar) throw new BadRequestException('name_ar required');
    const doc = { id: `dx_${Date.now()}`, doctor_id: doctorId, ...body, usage_count: 0, createdAt: new Date() };
    await this.conn.collection('saved_diagnoses').insertOne(doc);
    return { ok: true, diagnosis: doc };
  }

  async myDiagnoses(doctorId: string, search?: string): Promise<any[]> {
    const q: any = { doctor_id: doctorId };
    if (search) q.$or = [{ name_ar: { $regex: escapeRegex(String(search)), $options: 'i' } }, { name_en: { $regex: escapeRegex(String(search)), $options: 'i' } }];
    return this.conn.collection('saved_diagnoses').find(q).sort({ usage_count: -1 }).limit(50).toArray();
  }

  async blacklistPatient(doctorId: string, patientId: string, reason?: string) {
    if (!patientId) throw new BadRequestException('patient_id required');
    await this.conn.collection('doctor_blacklist').updateOne(
      { doctor_id: doctorId, patient_id: patientId },
      { $set: { doctor_id: doctorId, patient_id: patientId, reason: reason || null, active: true, createdAt: new Date() } },
      { upsert: true },
    );
    return { ok: true, blacklisted: true };
  }

  async unblacklistPatient(doctorId: string, patientId: string) {
    await this.conn.collection('doctor_blacklist').updateOne(
      { doctor_id: doctorId, patient_id: patientId },
      { $set: { active: false, updatedAt: new Date() } },
    );
    return { ok: true };
  }

  async myBlacklist(doctorId: string): Promise<any[]> {
    return this.conn.collection('doctor_blacklist').find({ doctor_id: doctorId, active: true }, { projection: { _id: 0 } }).toArray();
  }

  // ═══ DOCTOR: per-patient CRM (tags / notes / vip / favorite) ═══
  async getPatientCrm(doctorId: string, patientId: string): Promise<any> {
    const doc: any = await this.conn.collection('doctor_patient_crm').findOne(
      { doctor_id: doctorId, patient_id: patientId },
      { projection: { _id: 0 } },
    );
    return doc?.data || { tags: [], notes: [], vip: false, favorite: false };
  }

  async putPatientCrm(doctorId: string, patientId: string, data: any): Promise<any> {
    const clean = {
      tags: Array.isArray(data?.tags) ? data.tags.slice(0, 50).map((t: any) => String(t).slice(0, 60)) : [],
      notes: Array.isArray(data?.notes)
        ? data.notes.slice(0, 200).map((n: any) => ({
            id: String(n?.id || `n_${Date.now()}`),
            date: String(n?.date || new Date().toISOString().slice(0, 10)),
            text: String(n?.text || '').slice(0, 2000),
          })).filter((n: any) => n.text)
        : [],
      vip: !!data?.vip,
      favorite: !!data?.favorite,
    };
    await this.conn.collection('doctor_patient_crm').updateOne(
      { doctor_id: doctorId, patient_id: patientId },
      {
        $set: { data: clean, updatedAt: new Date() },
        $setOnInsert: { id: `crm_${Date.now()}`, doctor_id: doctorId, patient_id: patientId, createdAt: new Date() },
      },
      { upsert: true },
    );
    return clean;
  }

  /** Booking guard: blocked if patient blacklisted by this doctor. */
  async isBlacklisted(doctorId: string, patientId: string): Promise<boolean> {
    return !!(await this.conn.collection('doctor_blacklist').findOne({ doctor_id: doctorId, patient_id: patientId, active: true }));
  }

  // ═══ LAB: QC / STAT / critical / double verification ══════════════════════
  async labQc(user: any, bookingId: string, action: string, body: any = {}) {
    const allowed = ['sample_rejected', 'recollect_requested', 'mark_urgent', 'mark_stat', 'critical_value', 'verify', 'double_verify'];
    if (!allowed.includes(action)) throw new BadRequestException(`action must be one of ${allowed.join(',')}`);
    const b: any = await this.conn.collection('labbookings').findOne({ id: bookingId });
    if (!b) throw new NotFoundException('booking not found');
    // Ownership (P0 IDOR fix): only the serving lab/hospital or an admin may QC a booking.
    if (user?.role !== 'admin' && b.provider_account_id && b.provider_account_id !== user.id) {
      throw new ForbiddenException('booking_not_owned_by_lab');
    }

    const patch: any = { updatedAt: new Date() };
    const hist = { action, at: new Date(), by: user.id, role: user.role, note: body?.note || null };

    switch (action) {
      case 'sample_rejected':
        patch.sample_state = 'rejected';
        patch.sample_reject_reason = body?.reason || 'unsuitable_sample';
        break;
      case 'recollect_requested':
        patch.sample_state = 'recollect_requested';
        patch.state = 'RESCHEDULED';
        break;
      case 'mark_urgent':
        patch.priority = 'urgent';
        break;
      case 'mark_stat':
        patch.priority = 'stat';
        break;
      case 'critical_value':
        patch.critical_value = true;
        patch.critical_note = body?.note || null;
        // Notify doctor + patient immediately (critical value alert)
        await this.notifyUser(b.patient_id, 'نتيجة حرجة من المختبر', 'نتيجة تحليلك تحتاج مراجعة عاجلة — تواصل مع طبيبك.', { booking_id: bookingId, critical: true });
        if (b.doctor_id) await this.notifyUser(b.doctor_id, 'نتيجة حرجة لمريضك', `قيمة حرجة في الحجز ${bookingId}: ${body?.note || ''}`, { booking_id: bookingId, critical: true });
        break;
      case 'verify':
        patch.verified_by = user.id;
        patch.verified_at = new Date();
        patch.verification_state = 'verified';
        break;
      case 'double_verify':
        if (!b.verified_by) throw new BadRequestException('first verification required before double verification');
        patch.double_verified_by = user.id;
        patch.double_verified_at = new Date();
        patch.verification_state = 'double_verified';
        break;
    }
    await this.conn.collection('labbookings').updateOne({ id: bookingId }, { $set: patch, $push: { qc_history: hist } as any });
    // LJ-09: earnings are credited by the unified service.completed listener.
    return { ok: true, action, booking_id: bookingId, state: patch.state || b.state, priority: patch.priority || b.priority };
  }

  private async notifyUser(userId: string, title: string, body: string, data: any) {
    if (!userId) return;
    await this.conn.collection('notifications').insertOne({
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      user_id: userId, title_key: title, body_key: body,
      type: 'alert', priority: 'critical', is_read: false, data,
      createdAt: new Date(), updatedAt: new Date(),
    }).catch(() => {});
  }

  // ═══ NURSING: checklists + signature + GPS + escalation ══════════════════
  async nursingChecklist(user: any, bookingId: string, phase: 'before' | 'supplies' | 'after', items: Record<string, boolean>) {
    if (!['before', 'supplies', 'after'].includes(phase)) throw new BadRequestException('phase must be before|supplies|after');
    await this.conn.collection('homecarebookings').updateOne(
      { id: bookingId } as any,
      { $set: { [`checklists.${phase}`]: { items, completed_at: new Date(), by: user.id }, updatedAt: new Date() } },
    );
    return { ok: true, phase, completed: Object.values(items).filter(Boolean).length, total: Object.keys(items).length };
  }

  async nursingSign(user: any, bookingId: string, signatureBase64: string, signerName: string) {
    if (!signatureBase64 || signatureBase64.length < 100) throw new BadRequestException('signature required');
    if (!signerName?.trim()) throw new BadRequestException('signer name required');
    await this.conn.collection('homecarebookings').updateOne(
      { id: bookingId } as any,
      {
        $set: {
          patient_signature: { data_base64: signatureBase64.slice(0, 300000), signer_name: signerName.trim(), signed_at: new Date(), sha256: require('crypto').createHash('sha256').update(signatureBase64).digest('hex') },
          state: 'COMPLETED',
          completed_at: new Date(),
          updatedAt: new Date(),
        },
      },
    );
    // LJ-09: earnings are credited by the unified service.completed listener.
    return { ok: true, signed: true, signer: signerName.trim(), state: 'COMPLETED' };
  }

  async nursingTrack(user: any, bookingId: string, lat: number, lng: number) {
    if (typeof lat !== 'number' || typeof lng !== 'number') throw new BadRequestException('lat/lng required');
    await this.conn.collection('homecarebookings').updateOne(
      { id: bookingId } as any,
      { $push: { track_points: { lat, lng, at: new Date(), by: user.id } } as any, $set: { updatedAt: new Date() } },
    );
    return { ok: true };
  }

  async nursingEscalate(user: any, bookingId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('reason required');
    await this.conn.collection('homecarebookings').updateOne(
      { id: bookingId } as any,
      { $set: { emergency_escalation: { reason, by: user.id, at: new Date() }, state: 'ESCALATED', updatedAt: new Date() } },
    );
    await this.conn.collection('notifications').insertOne({
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role: 'admin', title_key: 'تصعيد طارئ من زيارة تمريض',
      body_key: `الزيارة ${bookingId}: ${reason}`, type: 'alert', priority: 'critical', is_read: false,
      data: { booking_id: bookingId, reason }, createdAt: new Date(), updatedAt: new Date(),
    }).catch(() => {});
    return { ok: true, escalated: true };
  }

  // ═══ FINANCE: invoice PDF + wallet ledger ═════════════════════════════════
  async invoicePdf(orderId: string, requester: any) {
    const o: any = await this.conn.collection('orders').findOne({ id: orderId });
    if (!o) throw new NotFoundException('order not found');
    if (o.patient_id !== requester.id && requester.role !== 'admin' && o.pharmacy_id !== requester.id) throw new BadRequestException('forbidden');
    const svc = new (require('../legal/legal-enterprise.service').LegalEnterpriseService)(this.conn);
    const total = o.total ?? o.totals?.total ?? 0;
    const pdf = svc.buildPdf(`Invoice ${o.id}`, [
      `Date: ${new Date(o.createdAt).toISOString().slice(0, 10)}`,
      `Order: ${o.id}`,
      `Patient: ${o.patient_id}`,
      `State: ${o.state || o.status}`,
      `Total: ${total} SAR`,
      `Commission: ${o.commission ?? 'platform rate'} · VAT 15% on commission`,
      '',
      ...(Array.isArray(o.items) ? o.items : []).slice(0, 30).map((i: any) => `- ${i.name_ar || i.name || i.medicine_id} ×${i.qty || 1} = ${i.price || 0} SAR`),
    ]);
    return pdf;
  }

  /**
   * Toggle the instant-booking availability of the authenticated provider.
   * A missing record intentionally starts offline so availability is never fabricated.
   */
  async toggleInstantAvailability(user: any, desired?: boolean): Promise<{ instant_available: boolean }> {
    const providerId = typeof user?.id === 'string' ? user.id.trim() : '';
    const providerType = user?.provider_type || user?.providerType;
    const providerRoles = ['doctor', 'facility', 'hospital', 'pharmacy', 'pharmacist', 'lab', 'radiology', 'nursing', 'nurse', 'home_care'];
    if (!providerId) throw new BadRequestException('provider_id_required');
    if (!providerType && !providerRoles.includes(String(user?.role || '').toLowerCase())) {
      throw new ForbiddenException('provider_account_required');
    }

    const collection = this.conn.collection('provideravailability');
    const existing: any = await collection.findOne({ provider_id: providerId });
    const instantAvailable = typeof desired === 'boolean' ? desired : !(existing?.instant_available === true);
    await collection.updateOne(
      { provider_id: providerId },
      {
        $set: {
          provider_id: providerId,
          provider_type: providerType || user?.role || null,
          instant_available: instantAvailable,
          updatedAt: new Date(),
        },
        $setOnInsert: { id: `availability_${providerId}`, createdAt: new Date() },
      },
      { upsert: true },
    );
    // The same switch is the provider's "online / accepting orders" state (provider-app toggleOnline).
    // Order routing (pharmacy broadcast, smart split, matching) reads provider_availability.status, so
    // without this the switch changed nothing and a new pharmacy never received a request.
    const now = new Date();
    await this.conn.collection('provider_availability').updateOne(
      { provider_account_id: providerId },
      {
        $set: { status: instantAvailable ? 'accepting_orders' : 'offline', ...(instantAvailable ? { last_online_at: now } : { last_offline_at: now }), updatedAt: now },
        $setOnInsert: { provider_account_id: providerId, createdAt: now },
      },
      { upsert: true },
    );
    return { instant_available: instantAvailable };
  }

  async instantAvailability(user: any): Promise<{ instant_available: boolean }> {
    const providerId = typeof user?.id === 'string' ? user.id.trim() : '';
    if (!providerId) throw new BadRequestException('provider_id_required');
    const row: any = await this.conn.collection('provideravailability').findOne({ provider_id: providerId });
    return { instant_available: row?.instant_available === true };
  }

  // ═══ COMPAT: stats / reviews / settings / consultation-end ═══════════════
  async statsToday(providerId: string): Promise<any> {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const sources = ['doctor_appointments', 'labbookings', 'homecarebookings', 'radiologybookings', 'orders'];
    const idFields = ['doctor_id', 'lab_id', 'provider_id', 'nurse_id', 'radiology_id', 'pharmacy_id'];
    let todayCount = 0, pendingCount = 0;
    for (const coll of sources) {
      try {
        const orConds = idFields.map(f => ({ [f]: providerId, createdAt: { $gte: dayStart } }));
        todayCount += await this.conn.collection(coll).countDocuments({ $or: orConds });
        const pendOr = idFields.map(f => ({ [f]: providerId, state: { $in: ['NEW_REQUEST', 'NEW', 'PENDING', 'REQUESTED', 'BROADCAST'] } }));
        pendingCount += await this.conn.collection(coll).countDocuments({ $or: pendOr });
      } catch { /* collection may not exist */ }
    }
    const revenue = (await this.earningRowsSince(providerId, dayStart)).reduce((s: number, t: any) => s + (t.amount || 0), 0);
    return { todayCount, revenue, pendingCount };
  }

  /** Period statistics for the provider Statistics screen — all computed from real bookings + wallet ledger + ratings. */
  async statsPeriod(providerId: string, period: 'week' | 'month' | 'year'): Promise<any> {
    const now = new Date();
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const rangeStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const bucketCount = period === 'week' ? 7 : 12;
    const bucketMs = (days * 24 * 60 * 60 * 1000) / bucketCount;
    const sources: Array<{ coll: string; label: string }> = [
      { coll: 'doctor_appointments', label: 'consultation' },
      { coll: 'labbookings', label: 'lab' },
      { coll: 'homecarebookings', label: 'home_care' },
      { coll: 'radiologybookings', label: 'radiology' },
    ];
    const idFields = ['doctor_id', 'lab_id', 'provider_id', 'nurse_id', 'radiology_id', 'pharmacy_id', 'account_id'];
    let appointments = 0;
    const perService: Record<string, number> = {};
    const patientIds = new Set<string>();
    for (const src of sources) {
      try {
        const rows: any[] = await this.conn.collection(src.coll)
          .find({ $or: idFields.map((f) => ({ [f]: providerId })), createdAt: { $gte: rangeStart } })
          .project({ patient_id: 1, user_id: 1, createdAt: 1 }).toArray();
        perService[src.label] = rows.length;
        appointments += rows.length;
        rows.forEach((r: any) => { const pid = r.patient_id || r.user_id; if (pid) patientIds.add(String(pid)); });
      } catch { /* collection may not exist */ }
    }
    // New patients = patients whose FIRST-ever booking with this provider falls inside the range.
    let newPatients = 0;
    for (const pid of patientIds) {
      let first: any = null;
      for (const src of sources) {
        try {
          const row: any = await this.conn.collection(src.coll)
            .find({ $or: idFields.map((f) => ({ [f]: providerId })), $and: [{ $or: [{ patient_id: pid }, { user_id: pid }] }] } as any)
            .sort({ createdAt: 1 }).limit(1).next();
          if (row && (!first || new Date(row.createdAt) < new Date(first.createdAt))) first = row;
        } catch { /* ignore */ }
      }
      if (first && new Date(first.createdAt) >= rangeStart) newPatients++;
    }
    const inRange = await this.earningRowsSince(providerId, rangeStart);
    const revenue = inRange.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const series = new Array(bucketCount).fill(0);
    for (const t of inRange) {
      const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((new Date(t.createdAt).getTime() - rangeStart.getTime()) / bucketMs)));
      series[idx] += Math.round((t.amount || 0) * 100) / 100;
    }
    const ratingRows: any[] = await this.conn.collection('ratings')
      .find({ $or: [{ provider_id: providerId }, { entity_id: providerId }], createdAt: { $gte: rangeStart } } as any)
      .project({ rating: 1, value: 1, stars: 1 }).toArray();
    const ratingValues = ratingRows.map((r: any) => Number(r.rating ?? r.value ?? r.stars)).filter((v: number) => Number.isFinite(v) && v > 0);
    const rating = ratingValues.length ? Math.round((ratingValues.reduce((a: number, b: number) => a + b, 0) / ratingValues.length) * 10) / 10 : null;
    const topService = Object.entries(perService).sort((a, b) => b[1] - a[1])[0];
    const service_breakdown = Object.entries(perService)
      .filter(([, count]) => count > 0)
      .map(([label, count]) => ({ label, count, pct: appointments > 0 ? Math.round((count / appointments) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);
    return {
      period,
      service_breakdown,
      revenue: Math.round(revenue * 100) / 100,
      appointments,
      rating,
      ratings_count: ratingValues.length,
      new_patients: newPatients,
      top_service: topService && topService[1] > 0 ? topService[0] : null,
      series,
      currency: 'SAR',
    };
  }

  async providerReviews(providerId: string): Promise<any[]> {
    const rows = await this.conn.collection('ratings')
      .find({ $or: [{ provider_id: providerId }, { entity_id: providerId }] })
      .sort({ createdAt: -1 }).limit(100).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || r._id?.toString(), _id: undefined }));
  }

  async replyReview(providerId: string, ratingId: string, reply: string) {
    if (!reply?.trim()) throw new BadRequestException('reply required');
    const own = { $or: [{ provider_id: providerId }, { entity_id: providerId }] };
    let r = await this.conn.collection('ratings').updateOne(
      { id: ratingId, ...own } as any,
      { $set: { reply: reply.trim(), reply_at: new Date() } },
    );
    if (!r.matchedCount) {
      // ratings created without an `id` field — match by Mongo _id
      try {
        const { Types } = require('mongoose');
        if (Types.ObjectId.isValid(ratingId)) {
          r = await this.conn.collection('ratings').updateOne(
            { _id: { $eq: new Types.ObjectId(ratingId) }, ...own } as any,
            { $set: { reply: reply.trim(), reply_at: new Date() } },
          );
        }
      } catch { /* invalid ObjectId format */ }
    }
    if (!r.matchedCount) throw new NotFoundException('review not found');
    return { ok: true };
  }

  async getProviderSetting(providerId: string, key: string, def: any): Promise<any> {
    const doc: any = await this.conn.collection('provider_settings').findOne({ provider_id: providerId });
    return doc?.[key] ?? def;
  }

  async setProviderSetting(providerId: string, key: string, value: any) {
    await this.conn.collection('provider_settings').updateOne(
      { provider_id: providerId },
      { $set: { provider_id: providerId, [key]: value, updatedAt: new Date() } },
      { upsert: true },
    );
    return { ok: true };
  }

  // Governance: pricing/hours/schedule changes stay draft until admin approves.
  async requestSettingChange(providerId: string, key: string, value: any) {
    const delta = {
      id: randomUUID(),
      provider_id: providerId,
      target: 'settings',
      requested_changes: { settings_key: key, value },
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.conn.collection('provider_deltas').insertOne(delta);
    return { ok: true, message: 'delta_submitted', pending_review: true, data: { id: delta.id, status: 'pending', target: 'settings' } };
  }

  /** The newest change of one settings key that is still waiting for admin review (null when none). */
  async pendingSettingChange(providerId: string, key: string): Promise<any> {
    const d: any = await this.conn.collection('provider_deltas').findOne(
      { provider_id: { $eq: providerId }, status: 'pending', target: 'settings', 'requested_changes.settings_key': { $eq: key } },
      { sort: { createdAt: -1 }, projection: { _id: 0, id: 1, requested_changes: 1, createdAt: 1 } },
    );
    return d ? { id: d.id, value: d.requested_changes?.value ?? null, submitted_at: d.createdAt } : null;
  }

  async endConsultation(user: any, body: any) {
    const appointmentId = body.appointment_id || body.id;
    if (!appointmentId) throw new BadRequestException('appointment_id required');
    const now = new Date();
    const r = await this.conn.collection('doctor_appointments').updateOne(
      { id: appointmentId },
      {
        $set: { state: 'completed', ended_at: now, updatedAt: now },
        $push: { state_history: { from: 'in_consultation', to: 'completed', by: user.id, at: now } } as any,
      },
    );
    if (!r.matchedCount) throw new NotFoundException('appointment not found');
    // Store consultation notes if provided
    if (body.notes || body.diagnosis) {
      await this.conn.collection('consultationnotes').insertOne(protectHealthDoc('consultationnotes', {
        id: `note_${Date.now()}`, appointment_id: appointmentId, doctor_id: user.id,
        notes: body.notes || null, diagnosis: body.diagnosis || null, createdAt: now,
      }));
    }
    // Store e-prescription if provided
    const appt: any = await this.conn.collection('doctor_appointments').findOne({ id: appointmentId });
    if (Array.isArray(body.prescription) && body.prescription.length) {
      await this.conn.collection('prescriptions').insertOne(protectHealthDoc('prescriptions', {
        id: `rx_${Date.now()}`, appointment_id: appointmentId, doctor_id: user.id,
        patient_id: appt?.patient_id || body.patient_id || null,
        items: body.prescription.map((i: any) => ({ ...i })), state: 'CREATED_BY_DOCTOR', createdAt: now,
      }));   // 16.9: raw write, so the health fields are encrypted here
    }
    // LJ-09: earnings are credited by the unified service.completed listener.
    return { ok: true, state: 'completed' };
  }

  /** Credit provider earnings on service completion: gross − commission − VAT(15% on commission only).
   *  Idempotent per (ref_type, ref_id) — a completed service can never be double-credited.
   *  E1 S8: enters ESCROW (state 'pending') and matures after the settlement delay. */
  async creditEarning(providerId: string, serviceType: string, gross: number, refType: string, refId: string, opts: { paymentMethod?: string } = {}): Promise<any> {
    if (!providerId || !gross || gross <= 0) return null;
    const dup = await this.conn.collection('platformledgerentries').findOne({ ref_type: refType, ref_id: refId, type: 'provider_earning' });
    if (dup) return dup;
    const cfg: any = await this.conn.collection('finance_config').findOne({ key: 'commissions' });
    const { percent: pct, source: commissionSource } = await this.commissionFor(serviceType, providerId, opts.paymentMethod);
    const vatPct = cfg?.tax?.vat_percent ?? 15;
    const delayDays = cfg?.settlement?.delay_days?.[serviceType] ?? cfg?.settlement?.delay_days?.default ?? settlementDelayDefault();
    const commission = Math.round(gross * pct) / 100;
    const vat = Math.round(commission * vatPct) / 100;
    const net = Math.round((gross - commission - vat) * 100) / 100;
    const row = {
      id: `earn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      provider_account_id: providerId,
      type: 'provider_earning', state: 'pending',
      available_at: new Date(Date.now() + delayDays * 24 * 3600 * 1000),
      amount: net, gross, commission_percent: pct, commission_source: commissionSource, commission, vat,
      ref_type: refType, ref_id: refId, createdAt: new Date(),
    };
    await this.conn.collection('platformledgerentries').insertOne(row as any);
    return row;
  }

  /** The commission percent of one provider's earning: CommissionResolver.forProvider (rules, the provider's own rate, the service default). */
  commissionFor(serviceType: string, providerAccountId: string, paymentMethod?: string): Promise<{ percent: number; source: string }> {
    return new CommissionResolver(this.conn).forProvider(serviceType, providerAccountId, paymentMethod);
  }

  /**
   * Earnings of one provider since a date. The stats used to filter `walletLedger(id, 500 | 1000)`, but that reads at
   * most the 200 newest rows of ANY type, so a busy provider's "revenue today / this month / this year" counted only
   * the last 200 ledger rows.
   */
  async earningRowsSince(providerId: string, since: Date): Promise<Array<{ amount: number; createdAt: Date }>> {
    return this.conn.collection('platformledgerentries').find(
      { provider_account_id: providerId, type: 'provider_earning', createdAt: { $gte: since } },
      { projection: { _id: 0, amount: 1, createdAt: 1 } },
    ).toArray() as unknown as Array<{ amount: number; createdAt: Date }>;
  }

  async walletLedger(providerId: string, limit = 100): Promise<any> {
    const rows = await this.conn.collection('platformledgerentries').find(
      { provider_account_id: providerId },
      { projection: { _id: 0 } },
    ).sort({ createdAt: -1 }).limit(Math.min(limit, 200)).toArray();
    const earned = rows.filter((r: any) => r.type === 'provider_earning').reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const paid = rows.filter((r: any) => r.type === 'payout').reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const pending = rows.filter((r: any) => r.state === 'pending').reduce((s: number, r: any) => s + (r.amount || 0), 0);
    return {
      transactions: rows,
      summary: { earned, paid, pending, balance: Math.max(0, earned - paid) },
    };
  }
}

// ── Controllers ─────────────────────────────────────────────────────────────

@Controller('provider/ops')
@UseGuards(JwtAuthGuard)
export class ProviderOpsController {
  constructor(private readonly svc: ProviderOpsService) {}

  // Doctor: leave/vacation
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @Post('doctor/leave') addLeave(@CurrentUser() u: any, @Body() b: AddLeaveDto) { return this.svc.addLeave(u.id, b); }
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('doctor/leave') leaves(@CurrentUser() u: any): Promise<any[]> { return this.svc.myLeaves(u.id); }
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @Delete('doctor/leave/:id') cancelLeave(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancelLeave(u.id, id); }

  // Doctor: templates/diagnoses/blacklist
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @Post('doctor/templates') saveTemplate(@CurrentUser() u: any, @Body() b: SaveTemplateDto) { return this.svc.saveTemplate(u.id, b); }
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('doctor/templates') templates(@CurrentUser() u: any): Promise<any[]> { return this.svc.myTemplates(u.id); }
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @Post('doctor/templates/:id/use') useTemplate(@CurrentUser() u: any, @Param('id') id: string): Promise<any> { return this.svc.useTemplate(u.id, id); }
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @Delete('doctor/templates/:id') delTemplate(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteTemplate(u.id, id); }
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @Post('doctor/diagnoses') saveDx(@CurrentUser() u: any, @Body() b: SaveDxDto) { return this.svc.saveDiagnosis(u.id, b); }
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('doctor/diagnoses') diagnoses(@CurrentUser() u: any, @Query('search') s?: string): Promise<any[]> { return this.svc.myDiagnoses(u.id, s); }
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @Post('doctor/blacklist/:patientId') block(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: BlockDto) { return this.svc.blacklistPatient(u.id, p, b?.reason); }
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @Delete('doctor/blacklist/:patientId') unblock(@CurrentUser() u: any, @Param('patientId') p: string) { return this.svc.unblacklistPatient(u.id, p); }
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('doctor/blacklist') blacklist(@CurrentUser() u: any): Promise<any[]> { return this.svc.myBlacklist(u.id); }
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('doctor/patient-crm/:patientId') getCrm(@CurrentUser() u: any, @Param('patientId') p: string) { return this.svc.getPatientCrm(u.id, p); }
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @Put('doctor/patient-crm/:patientId') putCrm(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: PutCrmDto) { return this.svc.putPatientCrm(u.id, p, b || {}); }

  // Lab QC
  @Roles(UserRole.LAB, UserRole.HOSPITAL, UserRole.ADMIN)
  @Post('lab/bookings/:id/qc/:action') qc(@CurrentUser() u: any, @Param('id') id: string, @Param('action') action: string, @Body() b: QcDto) { return this.svc.labQc(u, id, action, b); }

  // Nursing
  @Roles(UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.ADMIN)
  @Post('nursing/bookings/:id/checklist/:phase') checklist(@CurrentUser() u: any, @Param('id') id: string, @Param('phase') phase: string, @Body() b: ChecklistDto) { return this.svc.nursingChecklist(u, id, phase as any, b?.items || {}); }
  @Roles(UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.ADMIN)
  @Post('nursing/bookings/:id/sign') sign(@CurrentUser() u: any, @Param('id') id: string, @Body() b: SignDto) { return this.svc.nursingSign(u, id, b?.signature, b?.signer_name); }
  @Roles(UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.ADMIN)
  @Post('nursing/bookings/:id/track') track(@CurrentUser() u: any, @Param('id') id: string, @Body() b: TrackDto) { return this.svc.nursingTrack(u, id, b?.lat, b?.lng); }
  @Roles(UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.ADMIN)
  @Post('nursing/bookings/:id/escalate') escalate(@CurrentUser() u: any, @Param('id') id: string, @Body() b: EscalateDto) { return this.svc.nursingEscalate(u, id, b?.reason); }

  // Finance
  @Get('invoice/:orderId/pdf') async invoice(@CurrentUser() u: any, @Param('orderId') id: string, @Res({ passthrough: true }) res: any) {
    const pdf = await this.svc.invoicePdf(id, u);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="invoice-${id}.pdf"` });
    const { Readable } = require('stream');
    return new StreamableFile(Readable.from(pdf));
  }
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('wallet/ledger') wallet(@CurrentUser() u: any, @Query('limit') l?: string): Promise<any> { return this.svc.walletLedger(u.id, l ? parseInt(l) : 100); }
}

/**
 * Direction of one provider ledger row for the wallet list. The ledger stores payouts, clawbacks (`provider_debit`),
 * penalties and chargebacks with a POSITIVE amount and subtracts them in `LedgerService.providerBalance`, so the sign of
 * the amount cannot decide the direction: a refund clawback showed up as money received.
 */
const LEDGER_DEBIT_TYPES = new Set(['payout', 'provider_debit', 'penalty', 'chargeback']);
export function walletEntryDirection(entry: { type?: string; amount?: number }): 'CREDIT' | 'DEBIT' {
  return LEDGER_DEBIT_TYPES.has(String(entry.type)) || (entry.amount || 0) < 0 ? 'DEBIT' : 'CREDIT';
}

// ── Compat endpoints: routes the provider app calls that had no backend ─────

@Controller('provider')
@UseGuards(JwtAuthGuard)
export class ProviderCompatController {
  constructor(private readonly svc: ProviderOpsService, private readonly ledger: LedgerService) {}

  /** Availability is explicit operational state, never a UI default. */
  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.HOSPITAL, UserRole.DELIVERY, UserRole.ADMIN)
  @Post('ops/availability/toggle-instant')
  toggleInstantAvailability(@CurrentUser() u: any, @Body() b: ToggleInstantDto) {
    return this.svc.toggleInstantAvailability(u, b?.available);
  }

  /** The provider's own online switch as the server holds it, so the app starts from the truth (it always started "offline"). */
  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.HOSPITAL, UserRole.DELIVERY, UserRole.ADMIN)
  @Get('ops/availability/instant')
  async instantAvailability(@CurrentUser() u: any): Promise<{ instant_available: boolean }> {
    return this.svc.instantAvailability(u);
  }

  /**
   * Wallet summary { available, escrow, dues, earned } from the same ledger the withdrawal check reads
   * (LedgerService.providerBalance): available is never clamped, dues is what a negative balance owes the platform.
   */
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('wallet') async wallet(@CurrentUser() u: any) {
    const b = await this.ledger.providerBalance(u.id);
    return { available: b.available, escrow: b.pending, dues: b.available < 0 ? -b.available : 0, earned: b.lifetime_earned };
  }

  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('wallet/transactions') async walletTx(@CurrentUser() u: any) {
    const l = await this.svc.walletLedger(u.id, 100);
    return l.transactions.map((t: any) => ({
      id: t.id || t._id,
      // createdAt is a Date from Mongo: Date#toString() gave "Fri Oct 02" (no year, English weekday)
      date: t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : '',
      type: walletEntryDirection(t),
      amount: Math.abs(t.amount || 0),
      title: t.description || t.title || t.type,
    }));
  }

  /** Today's stats — shape: { todayCount, revenue, pendingCount } */
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('stats/today') async statsToday(@CurrentUser() u: any): Promise<any> {
    return this.svc.statsToday(u.id);
  }

  /** Period stats for the Statistics screen: week | month | year. */
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('stats/period') async statsPeriod(@CurrentUser() u: any, @Query('period') period?: string): Promise<any> {
    const p = period === 'week' || period === 'year' ? period : 'month';
    return this.svc.statsPeriod(u.id, p);
  }

  /** Doctor pricing settings (clinic/online/home) — persisted server-side. */
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('settings/pricing') async getPricing(@CurrentUser() u: any) {
    return { pricing: await this.svc.getProviderSetting(u.id, 'pricing', null) };
  }
  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.HOSPITAL, UserRole.DELIVERY, UserRole.ADMIN)
  @Put('settings/pricing') async putPricing(@CurrentUser() u: any, @Body() b: PutPricingDto) {
    return this.svc.requestSettingChange(u.id, 'pricing', b?.pricing ?? b);
  }

  /**
   * Facility tariffs (ICU daily/hourly, ward, surgery room, emergency fee). GET returns the approved
   * tariffs (null when none were ever approved) and the change still waiting for admin review, so the
   * screen starts from real values; PUT sends only the entered prices to admin review (same path as pricing).
   */
  @Roles(UserRole.HOSPITAL, UserRole.HOSPITAL_ADMIN, UserRole.ADMIN)
  @Get('settings/tariffs') async getTariffs(@CurrentUser() u: any): Promise<any> {
    const [tariffs, pending] = await Promise.all([
      this.svc.getProviderSetting(u.id, 'tariffs', null),
      this.svc.pendingSettingChange(u.id, 'tariffs'),
    ]);
    return { tariffs, pending };
  }
  @Roles(UserRole.HOSPITAL, UserRole.HOSPITAL_ADMIN, UserRole.ADMIN)
  @Put('settings/tariffs') async putTariffs(@CurrentUser() u: any, @Body() b: PutTariffsDto) {
    const keys: Array<keyof PutTariffsDto> = ['icu_daily', 'icu_hourly', 'ward_daily', 'surgery_room', 'emergency_fee'];
    const entered: Partial<Record<keyof PutTariffsDto, number>> = {};
    for (const k of keys) if (typeof b?.[k] === 'number') entered[k] = b[k];
    if (!Object.keys(entered).length) throw new BadRequestException('at least one tariff is required');
    return this.svc.requestSettingChange(u.id, 'tariffs', entered);
  }

  /** Reviews received by this provider */
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('reviews') async myReviews(@CurrentUser() u: any): Promise<any[]> {
    return this.svc.providerReviews(u.id);
  }

  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.HOSPITAL, UserRole.DELIVERY, UserRole.ADMIN)
  @Post('reviews/:id/reply') replyReview(@CurrentUser() u: any, @Param('id') id: string, @Body() b: ReplyReviewDto) {
    return this.svc.replyReview(u.id, id, b?.reply);
  }

  /** Working hours get/set */
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('working-hours') async getHours(@CurrentUser() u: any) {
    return this.svc.getProviderSetting(u.id, 'working_hours', null);
  }
  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.HOSPITAL, UserRole.DELIVERY, UserRole.ADMIN)
  @Put('working-hours') async putHours(@CurrentUser() u: any, @Body() b: PutHoursDto) {
    return this.svc.requestSettingChange(u.id, 'working_hours', b?.hours ?? b);
  }

  /** Schedule settings (nursing/providers): shifts, maxVisits, emergencyReady */
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('schedule/settings') async getSched(@CurrentUser() u: any) {
    return this.svc.getProviderSetting(u.id, 'schedule_settings', null);
  }
  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.HOSPITAL, UserRole.DELIVERY, UserRole.ADMIN)
  @Post('schedule/settings') async postSched(@CurrentUser() u: any, @Body() b: ScheduleSettingsDto) {
    return this.svc.requestSettingChange(u.id, 'schedule_settings', b || {});
  }

  /** End a consultation: complete appointment + store notes/prescription */
  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.HOSPITAL, UserRole.DELIVERY, UserRole.ADMIN)
  @Post('consultation/end') endConsultation(@CurrentUser() u: any, @Body() b: EndConsultationDto) {
    return this.svc.endConsultation(u, b || {});
  }
}

@Module({
  controllers: [ProviderOpsController, ProviderCompatController],
  providers: [ProviderOpsService],
  exports: [ProviderOpsService],
})
export class ProviderOpsModule {}
