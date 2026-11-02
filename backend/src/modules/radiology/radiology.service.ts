import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { withholdLegacyBeforeAcceptance } from '../provider-jobs/provider-job-privacy';
import { assertPaymentMethod } from '../../common/payment-policy';
import { assertScanned } from '../storage/pending-scan';
import { catalogueSortSpec } from '../catalogue-ranking/catalogue-ranking';
import { SearchService } from '../search/search.service';
import { RADIOLOGY_TYPES, byRelevance, matchedIds } from '../search/catalogue-search';
import { randomUUID } from 'crypto';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { byRating, paged, parsePage, withProviderRating, type CataloguePage } from '../../common/catalogue-page';
import { loadOffers, ownPrices, withOfferSummary, withOffers, type OfferSummary } from '../../common/service-offers';
import { pick } from '../../common/sanitize';
import { escapeRegex } from '../../common/slug.util';
import { pickAttribution } from '../../common/attribution';

/** P3.3 (F15): writable catalog fields — id/_id/active/governance flags excluded. */
export const RADIOLOGY_CATALOG_FIELDS = [
  'name_ar', 'name_en', 'short_code', 'description_ar', 'description_en', 'modality', 'modality_category', 'body_part', 'price', 'old_price', 'contrast_required', 'fasting_required', 'fasting_hours', 'home_visit_supported', 'facility_visit_supported', 'turnaround_hours', 'preparation_ar', 'preparation_en', 'requires_referral', 'medical_referral_required', 'popularity', 'active', 'unavailable', 'image_url', 'icon', 'estimated_duration_minutes', 'cash_availability', 'insurance_availability', 'portable_ultrasound',
] as const;
import { RadiologyService, RadiologyBookingState, RADIOLOGY_BOOKING_TRANSITIONS } from '../../schemas/radiology.schema';
import { RadiologyBooking } from './schemas/radiology-booking.schema';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { InsuranceFlowService } from '../insurance-engine/insurance-engine.module';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { RedisService } from '../redis/redis.service';
import { reviewUpdate, invalidateCatalogCache } from '../../common/catalog-review';
import { getEffectiveRoles } from '../../common/auth.guard';
import { ApprovalWorkflowService } from '../approval-workflow/approval-workflow.module';
import { isAdminUser } from '../../common/enums';

/** Fields of a centre's "add a scan" request that the approval workflow's radiology allowlist accepts. */
const RADIOLOGY_PROPOSAL_FIELDS = [
  'name_ar', 'name_en', 'modality_category', 'price', 'estimated_duration_minutes', 'insurance_availability', 'portable_ultrasound',
  'requires_pregnancy_check', 'requires_metal_implant_check', 'requires_contrast_allergy_check', 'preparation_ar', 'preparation_en',
] as const;

/** Preparation choices of the radiology app (ar, en), written into the proposal as text. */
const RADIOLOGY_PREPARATION_TEXT: Record<string, [string, string]> = {
  fasting_6h: ['صيام 6 ساعات', 'Fasting 6 hours'],
  drink_water: ['شرب لتر ماء', 'Drink 1L of water'],
  hold_urine: ['حبس البول', 'Full bladder'],
  creatinine: ['تحليل وظائف كلى', 'Recent creatinine test'],
  no_metal: ['إزالة الأشياء المعدنية', 'Remove metal objects'],
  contrast_consent: ['موافقة على الصبغة', 'Contrast consent'],
};

const ALLOWED_ROLES_PROVIDER = ['radiology', 'admin', 'hospital'];

import { nearestFirst } from '../provider/services/nearest-first';
import { NAME_PROJECTION, withItemNames, withScanNames } from '../../common/booking-names';

/** Public card for a provider in carousels and price lists: no contact or account details. */
function publicProvider(p: any) {
  return { id: p.account_id, name_ar: p.name_ar ?? null, name_en: p.name_en ?? null, logo: p.logo ?? null, rating: p.rating_count > 0 ? p.rating_avg : null, rating_count: p.rating_count || 0 };
}

/** Issue 1833: a radiology search matches every name field, in any language, case-insensitively. The text is escaped. */
export const RADIOLOGY_NAME_FIELDS = ['name_ar', 'name_en'] as const;
export function radiologySearchClause(search: string): { $or: Array<Record<string, RegExp>> } {
  const pattern = new RegExp(escapeRegex(search.trim()), 'i');
  return { $or: RADIOLOGY_NAME_FIELDS.map((field) => ({ [field]: pattern })) };
}


/** Two people: whoever uploaded the files or sent the report for review cannot publish it. True when this user did either. */
export function reportHandledBy(b: any, userId: unknown): boolean {
  return (Array.isArray(b?.state_history) ? b.state_history : []).some((h: any) => String(h?.by_user_id) === String(userId)
    && [RadiologyBookingState.REPORT_DRAFT, RadiologyBookingState.UNDER_REVIEW].includes(h?.to));
}

/** What the app needs to show the publish button honestly: may this user approve this report now, and did they handle it themselves. */
export function reportApprovalFor(b: any, userId: unknown): { report_can_approve: boolean; report_handled_by_me: boolean } {
  const handled = reportHandledBy(b, userId);
  return { report_can_approve: (b?.state || b?.status) === RadiologyBookingState.UNDER_REVIEW && !handled, report_handled_by_me: handled };
}


export interface RadiologySchedule {
  working_days?: unknown; morning_shift?: { from?: unknown; to?: unknown } | null; evening_shift?: { from?: unknown; to?: unknown } | null; emergency_available?: unknown;
}
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * The opening windows of one weekday (0 = Sunday) from the schedule the centre saved on its availability screen
 * (`provider_settings.radiology_schedule`, applied when the admin approves it): seven booleans from Sunday, and a morning and an
 * evening shift as `{from, to}`. A closed day, or a shift without a valid HH:MM pair, gives no window.
 */
export function radiologyWindows(schedule: RadiologySchedule | null | undefined, weekday: number): Array<{ open: string; close: string }> {
  const days = Array.isArray(schedule?.working_days) ? (schedule!.working_days as unknown[]) : null;
  if (!days || days[weekday] !== true) return [];
  const out: Array<{ open: string; close: string }> = [];
  for (const shift of [schedule!.morning_shift, schedule!.evening_shift]) {
    const from = String(shift?.from ?? ''); const to = String(shift?.to ?? '');
    if (HHMM.test(from) && HHMM.test(to)) out.push({ open: from, close: to });
  }
  return out;
}

@Injectable()
export class RadiologyOpsService {
  constructor(
    @InjectModel('RadiologyService') private svcModel: Model<any>,
    @InjectModel('RadiologyBooking') private bkgModel: Model<any>,
    @InjectModel('RadiologyCenterBooking') private centerBkgModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('LabResult') private resultModel: Model<any>,
    @InjectModel('StorageObject') private storageObjects: Model<any>,
    @InjectModel('ProviderProfile') private profileModel: Model<any>,
    private engine: WorkflowEngineService,
    private events: EventEmitter2,
    @Optional() private readonly redis?: RedisService,
    @Optional() private readonly insurance?: InsuranceFlowService,
    @Optional() private readonly approvals?: ApprovalWorkflowService,
    @Optional() @InjectConnection() private readonly conn?: Connection,
    @Optional() private readonly searchEngine?: SearchService,
  ) {}

  // ──────────────────────────────────────────────
  // PILLAR 1: State Transition (validated)
  // ──────────────────────────────────────────────
  /** Bookings may live in either collection (legacy or center) — unify lookup. */
  private async findBooking(id: string, user?: any): Promise<any> {
    const b = await this.bkgModel.findOne({ id });
    if (b) {
      if (user) {
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';
        const isPatient = b.patient_id === user.id;
        const isProvider = b.provider_account_id === (user.account_id ?? user.id);
        if (!isAdmin && !isPatient && !isProvider) {
          throw new NotFoundException();
        }
      }
      return b;
    }
    const centerBkg = await this.centerBkgModel.findOne({ id });
    if (centerBkg) {
      if (user) {
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';
        const isPatient = centerBkg.patient_id === user.id;
        const isProvider = centerBkg.provider_account_id === (user.account_id ?? user.id);
        if (!isAdmin && !isPatient && !isProvider) {
          throw new NotFoundException();
        }
      }
      return centerBkg;
    }
    return null;
  }

  private async privateProviderStorage(id: string, user: any, requirePdf = false): Promise<any> {
    const object: any = await this.storageObjects.findOne({ id, owner_account_id: user.id, visibility: 'private', deleted: false }).lean();
    if (!object) throw new ForbiddenException('private_storage_object_not_owned');
    assertScanned(object); // a file still in quarantine (423) cannot be attached to a result
    if (requirePdf && object.mime !== 'application/pdf') throw new BadRequestException('report_pdf_storage_object_required');
    return object;
  }

  async transition(id: string, targetState: string, user: any, note?: string) {
    const b = await this.findBooking(id, user);
    if (!b) throw new NotFoundException('Radiology booking not found');
    // Center bookings store the lifecycle in `status`; legacy in `state`.
    // Normalize the center vocabulary onto the ops transitions map.
    let current = b.state || b.status;
    const aliases: Record<string, string> = { PENDING_ACCEPTANCE: 'NEW_REQUEST', ACCEPTED: 'CONFIRMED', CHECKED_IN: 'ARRIVED_CHECKIN', SCANNING_COMPLETED: 'REPORT_DRAFT', REPORT_UPLOADED: 'REPORT_DRAFT' };
    current = aliases[current] || current;
    const allowed = RADIOLOGY_BOOKING_TRANSITIONS[current as RadiologyBookingState] ?? [];
    if (!allowed.includes(targetState)) {
      throw new BadRequestException(`Cannot transition from ${current} to ${targetState}`);
    }
    // The patient may only cancel (before arriving); every other move belongs to the booked center.
    const roles = getEffectiveRoles(user);
    const isStaff = roles.some((r) => ['admin', 'super_admin', 'radiology', 'hospital'].includes(r));
    if (!isStaff || (b.patient_id === user.id && !roles.includes('admin'))) {
      if (targetState !== RadiologyBookingState.CANCELLED) throw new ForbiddenException('patient_can_only_cancel');
    }
    if (current === RadiologyBookingState.NEW_REQUEST && targetState === RadiologyBookingState.CONFIRMED) this.assertConfirmable(b);
    b.state_history = [...(b.state_history || []), { from: current, to: targetState, by_user_id: user.id, by_role: user.role, at: new Date(), note }];
    b.state = targetState;
    if (b.status !== undefined) b.status = targetState;
    b.markModified?.('state_history');
    await b.save();
    // MODULE 16: Emit notification
    this.events.emit('radiology.state_changed', { bookingId: id, state: targetState, patientId: b.patient_id });
    // The cancel goes back to the card: the finance listener refunds what was paid (nothing was scanned yet).
    if (targetState === RadiologyBookingState.CANCELLED) this.events.emit('radiology.booking_cancelled', { booking_id: b.id, patient_id: b.patient_id, prior_state: current });
    return b;
  }

  /** Same payment rule as labs: cash only at the center, card must be paid, insurance via coverage decision. */
  private assertConfirmable(b: any) {
    if (b.payment_method === 'insurance') throw new BadRequestException('insurance_booking_requires_coverage_decision');
    if (b.payment_method === 'card' && b.payment_status !== 'paid') throw new BadRequestException('card_payment_not_completed');
    if (b.payment_method === 'cash' && b.location_type === 'home') throw new BadRequestException('cash_only_at_facility');
  }

  /** Verified card payment confirms a new radiology booking. */
  @OnEvent('payment.completed')
  async confirmPaidBooking(event: any) {
    if (event?.booking_kind !== 'radiology' || !event?.booking_id) return;
    const b = await this.bkgModel.findOne({ id: event.booking_id });
    if (!b || b.state !== RadiologyBookingState.NEW_REQUEST || b.payment_method !== 'card') return;
    b.state_history = [...(b.state_history || []), { from: b.state, to: RadiologyBookingState.CONFIRMED, by_user_id: 'system', by_role: 'system', at: new Date(), note: 'card_payment_verified' }];
    b.state = RadiologyBookingState.CONFIRMED;
    b.payment_status = 'paid';
    await b.save().catch(() => null);
    this.events.emit('radiology.state_changed', { bookingId: b.id, state: b.state, patientId: b.patient_id });
  }

  // ──────────────────────────────────────────────
  // PILLAR 5: Check-In → ARRIVED_CHECKIN
  // ──────────────────────────────────────────────
  async checkin(id: string, user: any) {
    const b = await this.findBooking(id, user);
    if (!b) throw new NotFoundException();
    if (b.state !== RadiologyBookingState.CONFIRMED) throw new BadRequestException('Booking must be CONFIRMED to check-in');
    (b.state_history = b.state_history || []).push({ from: b.state, to: RadiologyBookingState.ARRIVED_CHECKIN, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'Patient checked-in at reception' });
    b.state = RadiologyBookingState.ARRIVED_CHECKIN;
    b.checkin_at = new Date();
    await b.save();
    this.events.emit('radiology.state_changed', { bookingId: id, state: RadiologyBookingState.ARRIVED_CHECKIN, patientId: b.patient_id });
    return b;
  }

  // ──────────────────────────────────────────────
  // PILLAR 5: Start Scan → IN_SCANNING
  // ──────────────────────────────────────────────
  async startScan(id: string, user: any) {
    const b = await this.findBooking(id, user);
    if (!b) throw new NotFoundException();
    if (b.state !== RadiologyBookingState.ARRIVED_CHECKIN) throw new BadRequestException('Patient must check-in first');
    (b.state_history = b.state_history || []).push({ from: b.state, to: RadiologyBookingState.IN_SCANNING, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'Scan started — patient called into scanning room' });
    b.state = RadiologyBookingState.IN_SCANNING;
    b.scan_started_at = new Date();
    await b.save();
    this.events.emit('radiology.state_changed', { bookingId: id, state: RadiologyBookingState.IN_SCANNING, patientId: b.patient_id });
    return b;
  }

  // ──────────────────────────────────────────────
  // PILLAR 5: Abort Scan → SCAN_ABORTED (Emergency)
  // ──────────────────────────────────────────────
  async abortScan(id: string, user: any, reason: string) {
    const VALID_ABORT_REASONS = ['PATIENT_PANIC', 'MACHINE_FAILURE', 'CONTRAST_REACTION', 'CLAUSTROPHOBIA', 'PATIENT_NO_SHOW', 'TECHNICAL_ERROR', 'EMERGENCY_SHUTDOWN'];
    if (!VALID_ABORT_REASONS.includes(reason)) {
      throw new BadRequestException(`Invalid abort reason. Must be one of: ${VALID_ABORT_REASONS.join(', ')}`);
    }
    const b = await this.findBooking(id, user);
    if (!b) throw new NotFoundException();
    // State machine: a scan can only be aborted while the patient is checked-in / mid-scan —
    // aborting a fresh or completed booking corrupts the lifecycle and refund flow.
    const abortable = [RadiologyBookingState.ARRIVED_CHECKIN, RadiologyBookingState.IN_SCANNING];
    if (!abortable.includes(b.state as RadiologyBookingState)) {
      throw new BadRequestException(`invalid_transition_${b.state}_to_SCAN_ABORTED`);
    }
    b.abort_reason = reason;
    (b.state_history = b.state_history || []).push({ from: b.state, to: RadiologyBookingState.SCAN_ABORTED, by_user_id: user.id, by_role: user.role, at: new Date(), note: `EMERGENCY ABORT: ${reason}` });
    b.state = RadiologyBookingState.SCAN_ABORTED;
    b.scan_completed_at = new Date();
    await b.save();
    // MODULE 16: Notify patient + generate refund ticket to admin
    this.events.emit('radiology.scan_aborted', { bookingId: id, reason, patientId: b.patient_id, providerAccountId: b.provider_account_id });
    return b;
  }

  // ──────────────────────────────────────────────
  // PILLAR 6 + MODULE 10: Upload Report → REPORT_DRAFT
  // ──────────────────────────────────────────────
  async uploadReport(id: string, user: any, body: any) {
    const b = await this.findBooking(id, user);
    if (!b) throw new NotFoundException();
    if (body.pdf_url || body.dicom_url || body.image_urls) throw new BadRequestException('raw_report_urls_not_allowed');
    // A report belongs to a performed scan (or replaces a draft sent back from review).
    if (![RadiologyBookingState.IN_SCANNING, RadiologyBookingState.REPORT_DRAFT].includes((b.state || b.status) as RadiologyBookingState)) {
      throw new BadRequestException(`invalid_transition_${b.state || b.status}_to_REPORT_DRAFT`);
    }
    const reportObjectId = String(body.report_storage_object_id || '').trim();
    if (!reportObjectId) throw new BadRequestException('report_storage_object_id_required');
    await this.privateProviderStorage(reportObjectId, user, true);
    if (body.dicom_storage_object_id) await this.privateProviderStorage(String(body.dicom_storage_object_id), user);
    const imageObjectIds = Array.isArray(body.scan_storage_object_ids) ? body.scan_storage_object_ids.map(String) : [];
    for (const objectId of imageObjectIds) await this.privateProviderStorage(objectId, user);
    b.report_storage_object_id = reportObjectId;
    b.dicom_storage_object_id = body.dicom_storage_object_id ? String(body.dicom_storage_object_id) : undefined;
    b.scan_storage_object_ids = imageObjectIds;
    b.signed_report_pdf_url = undefined;
    b.dicom_url = undefined;
    b.scan_image_urls = [];
    if (body.findings) b.clinical_impression_report = body.findings;
    b.report_status = 'draft';
    (b.state_history = b.state_history || []).push({ from: b.state || b.status, to: RadiologyBookingState.REPORT_DRAFT, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'Report files uploaded by technician' });
    b.state = RadiologyBookingState.REPORT_DRAFT;
    if (b.status !== undefined) b.status = RadiologyBookingState.REPORT_DRAFT as any;
    b.markModified?.('state_history');
    await b.save();
    return b;
  }

  // MODULE 10: Submit for Radiologist Review → UNDER_REVIEW
  async submitReportForReview(id: string, user: any, body: any) {
    const b = await this.findBooking(id, user);
    if (!b) throw new NotFoundException();
    if (!b.report_storage_object_id) throw new BadRequestException('secure_report_storage_object_required_before_review');
    if ((b.state || b.status) !== RadiologyBookingState.REPORT_DRAFT) throw new BadRequestException(`invalid_transition_${b.state || b.status}_to_UNDER_REVIEW`);
    b.report_status = 'under_review';
    (b.state_history = b.state_history || []).push({ from: b.state, to: RadiologyBookingState.UNDER_REVIEW, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'Submitted for radiologist quality review' });
    b.state = RadiologyBookingState.UNDER_REVIEW;
    if (b.status !== undefined) b.status = RadiologyBookingState.UNDER_REVIEW as any;
    b.markModified?.('state_history');
    await b.save();
    this.events.emit('radiology.report_under_review', { bookingId: id });
    return b;
  }

  // MODULE 10: Radiologist Approves → REPORT_READY + notify patient + doctor
  async approveReport(id: string, user: any) {
    const b = await this.findBooking(id, user);
    if (!b) throw new NotFoundException();
    if ((b.state || b.status) !== RadiologyBookingState.UNDER_REVIEW) throw new BadRequestException('Report must be UNDER_REVIEW to approve');
    // Two people: whoever uploaded the files or sent the report for review cannot publish it.
    if (reportHandledBy(b, user.id)) throw new ForbiddenException('report_reviewer_must_differ_from_uploader');
    // Through the workflow engine: publishing the report completes the service, and `service.completed` (once) is what credits the
    // centre's earning. Writing the state directly left the report published but the wallet empty.
    const fromState = b.state || b.status;
    await this.engine.apply({
      kind: 'radiology', entity_id: b.id, from_domain: fromState, to_domain: RadiologyBookingState.REPORT_READY,
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: 'report_published',
      mutate: async () => {
        b.report_status = 'ready';
        b.report_approved_by = user.id;
        b.report_approved_at = new Date();
        (b.state_history = b.state_history || []).push({ from: b.state, to: RadiologyBookingState.REPORT_READY, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'Report approved and published by radiologist' });
        b.state = RadiologyBookingState.REPORT_READY;
        if (b.status !== undefined) b.status = RadiologyBookingState.REPORT_READY as any;
        b.markModified?.('state_history');
        await b.save();
        return b;
      },
    });
    // MODULE 11: Doctor auto-routing if referral exists
    if (b.referring_doctor_id) {
      this.events.emit('radiology.doctor_notify', { bookingId: id, doctorId: b.referring_doctor_id, patientId: b.patient_id, pdfUrl: b.signed_report_pdf_url, dicomUrl: b.dicom_url });
      b.doctor_notified = true;
      await b.save();
    }
    // Notify patient
    this.events.emit('radiology.state_changed', { bookingId: id, state: RadiologyBookingState.REPORT_READY, patientId: b.patient_id });
    return b;
  }

  // Also expose combined publish (for backward compat)
  async publishReport(id: string, user: any) {
    return this.approveReport(id, user);
  }

  // ──────────────────────────────────────────────
  // PILLAR 4: Insurance approval gate (the provider records the insurer's decision; nothing here asks an insurer)
  // ──────────────────────────────────────────────
  async processInsuranceApproval(id: string, user: any, body: { approval_code: string; copay: number }) {
    const b = await this.findBooking(id, user);
    if (!b) throw new NotFoundException();
    // State machine: insurance approval is only valid during the insurance phase —
    // approving on an in-progress/completed booking would rewind it to CONFIRMED.
    const insurancePhase = [RadiologyBookingState.NEW_REQUEST, RadiologyBookingState.PENDING_INSURANCE, RadiologyBookingState.WAITING_COPAY];
    if (!insurancePhase.includes(b.state as RadiologyBookingState)) {
      throw new BadRequestException(`invalid_transition_${b.state}_to_insurance_approval`);
    }
    // LJ-03: route the radiology decision through the insurance request engine so a
    // radiology booking on insurance has the same decision + copay path as the rest.
    let copay = Number(body.copay) || 0;
    if (this.insurance) {
      const request: any = await this.insurance.providerDecideBooking(user, 'radiology', id, {
        decision: copay > 0 ? 'partial' : 'approved',
        copay,
        approval_code: body.approval_code,
        reason: body.approval_code || 'radiology coverage rejected',
      });
      if (request) {
        copay = Number(request.copay_amount ?? copay) || 0;
        b.insurance_request_id = request.id;
      }
    }
    b.insurance_approval_code = body.approval_code;
    b.insurance_copay = copay;
    b.insurance_status = 'approved';
    const nextState = copay > 0 ? RadiologyBookingState.WAITING_COPAY : RadiologyBookingState.CONFIRMED;
    (b.state_history = b.state_history || []).push({ from: b.state, to: nextState, by_user_id: user.id, by_role: user.role, at: new Date(), note: `Insurance approved. Reference: ${body.approval_code}. Copay: ${copay} SAR` });
    b.state = nextState;
    await b.save();
    this.events.emit('radiology.insurance_approved', { bookingId: id, patientId: b.patient_id, copay });
    return b;
  }

  // ──────────────────────────────────────────────
  // MODULE 14: Reschedule Booking
  // ──────────────────────────────────────────────
  async rescheduleBooking(id: string, user: any, body: { new_date: string; reason: string }) {
    const b = await this.findBooking(id, user);
    if (!b) throw new NotFoundException();
    if (![RadiologyBookingState.PENDING, RadiologyBookingState.NEW_REQUEST, RadiologyBookingState.CONFIRMED].includes((b.state || b.status) as any)) throw new BadRequestException('cannot_reschedule');
    const when = new Date(body?.new_date);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) throw new BadRequestException('slot_expired');
    const oldDate = b.scheduled_at;
    b.scheduled_at = when;
    b.reschedule_reason = body.reason;
    (b.state_history = b.state_history || []).push({ from: b.state, to: b.state, by_user_id: user.id, by_role: user.role, at: new Date(), note: `Rescheduled from ${oldDate} to ${b.scheduled_at}. Reason: ${body.reason}` });
    await b.save();
    this.events.emit('radiology.rescheduled', { bookingId: id, patientId: b.patient_id, newDate: b.scheduled_at });
    this.events.emit('booking.rescheduled', { entity_type: 'radiology_booking', entity_id: b.id, actor_role: user.role, patient_account_id: b.patient_id, meta: { new_date: b.scheduled_at } });
    return b;
  }

  // ──────────────────────────────────────────────
  // MODULE 9: Tracking / Timeline for patient
  // ──────────────────────────────────────────────
  async getTracking(id: string, user: any) {
    const b: any = await this.bkgModel.findOne({ id }).lean();
    if (!b) throw new NotFoundException();
    if (b.patient_id !== user.id && user.role !== 'admin' && user.role !== 'super_admin') {
      throw new NotFoundException();
    }
    const steps = (b.state_history || []).map((h: any) => ({
      state: h.to,
      label_ar: this._stateLabel(h.to, 'ar'),
      label_en: this._stateLabel(h.to, 'en'),
      at: h.at,
      done: true,
    }));
    return {
      current_state: b.state,
      patient_label_ar: this._stateLabel(b.state, 'ar'),
      patient_label_en: this._stateLabel(b.state, 'en'),
      scheduled_at: b.scheduled_at,
      preparation_confirmed: b.preparation_confirmed,
      technician: await this.technicianView(b),
      steps,
    };
  }

  private _stateLabel(state: string, lang: 'ar' | 'en'): string {
    const map: Record<string, { ar: string; en: string }> = {
      NEW_REQUEST:       { ar: 'جاري مراجعة الطلب',              en: 'Request under review' },
      PENDING_INSURANCE: { ar: 'ننتظر موافقة التأمين',            en: 'Awaiting insurance approval' },
      WAITING_COPAY:     { ar: 'مطلوب دفع نسبة التحمل',           en: 'Co-pay required' },
      CONFIRMED:         { ar: 'تم التأكيد - بانتظار حضورك',      en: 'Confirmed — please arrive on time' },
      ARRIVED_CHECKIN:   { ar: 'أنت الآن بالمركز',                en: 'You are at the center' },
      IN_SCANNING:       { ar: 'جاري إجراء الفحص',                en: 'Scan in progress' },
      REPORT_DRAFT:      { ar: 'جاري إعداد التقرير',              en: 'Report being prepared' },
      UNDER_REVIEW:      { ar: 'التقرير قيد المراجعة',            en: 'Report under review' },
      REPORT_READY:      { ar: 'نتيجتك جاهزة',                   en: 'Your result is ready' },
      SCAN_ABORTED:      { ar: 'تم إلغاء الفحص (حالة طارئة)',     en: 'Scan cancelled (emergency)' },
      CANCELLED:         { ar: 'تم الإلغاء',                      en: 'Cancelled' },
    };
    return map[state]?.[lang] ?? state;
  }

  // ──────────────────────────────────────────────
  // MODULE 15: Catalog Delta Request (requires admin approval)
  // ──────────────────────────────────────────────
  /**
   * A centre's request to add a scan, or to change its schedule, reaches an admin. It used to emit an event that only
   * the SEO indexer listens to and answer "submitted for admin approval": nothing was stored, nothing reached the
   * admin, and the centre's price and schedule were lost.
   *  - a new scan goes through the approval workflow the lab dashboard uses (`/approval-workflow/requests`);
   *  - a schedule update is a settings change waiting for review (`provider_deltas`, applied on approval).
   */
  async catalogDeltaRequest(user: any, body: any) {
    if (!this.approvals || !this.conn) throw new ServiceUnavailableException('approval_workflow_unavailable');
    const accountId = user.account_id ?? user.id;
    if (body?.type === 'schedule_update') {
      const value = {
        working_days: body.working_days, morning_shift: body.morning_shift, evening_shift: body.evening_shift,
        emergency_available: body.emergency_available === true,
      };
      const delta = {
        id: randomUUID(), provider_id: accountId, target: 'settings',
        requested_changes: { settings_key: 'radiology_schedule', value },
        status: 'pending', createdAt: new Date(), updatedAt: new Date(),
      };
      await this.conn.collection('provider_deltas').insertOne(delta as any);
      return { ok: true, message: 'delta_submitted', pending_review: true, data: { id: delta.id, status: 'pending', target: 'settings' } };
    }
    if (!String(body?.name_en || body?.name_ar || '').trim()) throw new BadRequestException('name_required');
    if (!(Number(body?.price) >= 0)) throw new BadRequestException('price_required');
    const prep = (Array.isArray(body?.preparation_keys) ? body.preparation_keys : [])
      .map((k: string) => RADIOLOGY_PREPARATION_TEXT[k]).filter(Boolean) as [string, string][];
    const change = pick({
      ...body,
      preparation_ar: prep.length ? prep.map((p) => p[0]).join('، ') : undefined,
      preparation_en: prep.length ? prep.map((p) => p[1]).join(', ') : undefined,
    }, [...RADIOLOGY_PROPOSAL_FIELDS]);
    return this.approvals.createRequest(user.id, user.role, { entity_type: 'service', change_data: { type: 'radiology', ...change } });
  }

  // MODULE 12: Patient confirms preparation
  async confirmPreparation(id: string, user: any) {
    const b = await this.findBooking(id, user);
    if (!b) throw new NotFoundException();
    b.preparation_confirmed = true;
    b.preparation_confirmed_at = new Date();
    await b.save();
    return { ok: true };
  }

  // ──────────────────────────────────────────────
  // Legacy / Existing Methods
  // ──────────────────────────────────────────────
  async list(opts: any) {
    const q: any = { is_deleted: false, active: true, public_eligibility: true, medical_review_status: 'approved' };
    if (opts.modality) q.modality = { $eq: opts.modality };
    if (opts.body_part) q.body_part = { $eq: opts.body_part };
    // Issue 1833: the name search reads all six name fields (no text index needed for the 34 scans in the catalogue).
    // the search box uses the home search's engine (typo tolerance, ar/en synonyms); its own text match is the fallback
    const matched = opts.search?.trim() ? await matchedIds(this.searchEngine, opts.search, RADIOLOGY_TYPES) : null;
    if (opts.search?.trim()) { if (matched) q.id = { $in: matched }; else q.$or = radiologySearchClause(opts.search).$or; }
    const page = parsePage(opts.page, opts.limit);
    // 2026-10-28: the list is the CATALOGUE; each scan carries what providers offer for it (count, from-price, where, insurance). The home and insurance
    // filters read those offers, so a scan nobody offers yet is still listed (and found by "all") but never by "at home" or "insurance".
    const finish = async <T extends { id: string }>(rows: T[]): Promise<Array<T & OfferSummary> | CataloguePage<T & OfferSummary>> => {
      const enriched = await withOfferSummary(this.svcModel.db as never, 'radiology', rows, { home_only: !!opts.home_only, insurance: !!opts.insurance });
      return page ? paged(enriched, page) : enriched;
    };
    // every scan carries its category (= its modality) so a client can pick the illustration
    const withCategory = <T extends { modality?: string }>(rows: T[]) => rows.map((r) => ({ ...r, category: r.modality ?? null }));
    // the centre performs the scan when its equipment_list holds the scan id or its modality (same rule as compatibleProviders)
    const performs = (svc: any, centre: any) => {
      const has: unknown[] = Array.isArray(centre.equipment_list) ? centre.equipment_list : [];
      return has.includes(svc.id) || (!!svc.modality && has.includes(svc.modality));
    };

    // #623: "nearest" orders scans by the closest approved centre that performs them (same rule as
    // compatibleProviders: the centre's equipment_list holds the scan id or its modality).
    if (opts.nearest && Number.isFinite(opts.lat) && Number.isFinite(opts.lng)) {
      const here = { lat: opts.lat as number, lng: opts.lng as number };
      const centres: any[] = await this.profileModel.find({
        type: { $in: ['radiology', 'hospital'] }, status: 'active', public_eligibility: true, medical_review_status: 'approved',
        'geo.lat': { $type: 'number' }, 'geo.lng': { $type: 'number' },
      }, { _id: 0, geo: 1, equipment_list: 1 }).lean();
      const services: any[] = await this.svcModel.find(q).lean();
      return finish(withCategory(nearestFirst(services, centres, here, performs).slice(0, 120)));
    }

    const load = async () => {
      let services: any[] = await this.svcModel.find(q).sort(catalogueSortSpec(opts.sort)).lean();
      if (matched) services = byRelevance(services, matched);   // the sorts below (rating, price) still reorder
      if (opts.highest_rated) {
        // ratings are on the centres, not on the scans: a scan is ranked by the centres that perform it
        const centres: any[] = await this.profileModel.find({
          type: { $in: ['radiology', 'hospital'] }, status: 'active', public_eligibility: true, medical_review_status: 'approved',
        }, { _id: 0, equipment_list: 1, rating_avg: 1, rating_count: 1 }).lean();
        return finish(withCategory(withProviderRating(services, centres, performs).sort(byRating)));
      }
      // lowest price first; a scan without a real price (0 or missing) is not the cheapest
      if (opts.lowest_price) {
        const cost = (s: any) => (Number(s.price) > 0 ? Number(s.price) : Number.POSITIVE_INFINITY);
        services.sort((a, b) => cost(a) - cost(b) || (b.popularity ?? 0) - (a.popularity ?? 0));
      }
      return finish(withCategory(services));
    };
    if (!this.redis?.getWithSWR) return load();
    const cacheKey = `cache:radiology-services:public:v2:${JSON.stringify(opts)}`;
    return this.redis.getWithSWR(cacheKey, 900, load);
  }


  async modalities() {
    return this.svcModel.distinct('modality', { is_deleted: false, active: true, public_eligibility: true, medical_review_status: 'approved' });
  }

  async getById(id: string) {
    // The legacy `id` field on catalog docs is stored as binary garbage, so
    // public detail lookup must use `_id` (or human `short_code`) instead.
    const base = { is_deleted: false, active: true, public_eligibility: true, medical_review_status: 'approved' } as const;
    const or: Record<string, unknown>[] = [{ id: { $eq: id } }, { short_code: { $eq: id } }];
    if (Types.ObjectId.isValid(id)) or.unshift({ _id: { $eq: new Types.ObjectId(id) } });
    const svc = await this.svcModel.findOne({ ...base, $or: or }).lean();
    if (!svc) throw new NotFoundException();
    return svc;
  }

  /** The scan page: the catalogue row with what providers offer for it (centres, price, where, insurance) and `providers_count`; an unoffered scan still opens. */
  async getByIdWithOffers(id: string) {
    const svc: any = await this.getById(id);
    const plain = typeof svc.toObject === 'function' ? svc.toObject() : svc;
    return withOffers(this.svcModel.db as never, 'radiology', { ...plain, category: plain.modality ?? null });
  }

  /** Centers able to perform every requested scan (registration stores the scan ids in equipment_list). */
  async compatibleProviders(serviceIds: string[]) {
    const ids = [...new Set((serviceIds || []).filter(Boolean))];
    if (!ids.length) return [];
    const services = await this.svcModel.find({ id: { $in: ids }, is_deleted: false, active: true, public_eligibility: true, medical_review_status: 'approved' }, { _id: 0, id: 1, modality: 1, body_part: 1, short_code: 1, price: 1 }).lean();
    if (services.length !== ids.length) return [];
    const modalities = [...new Set((services as any[]).map((sv) => sv.modality).filter(Boolean))];
    const profiles = await this.profileModel.find({
      type: { $in: ['radiology', 'hospital'] }, status: 'active', public_eligibility: true, medical_review_status: 'approved',
      account_id: { $exists: true, $ne: null },
      $or: [{ equipment_list: { $all: ids } }, ...(modalities.length ? [{ equipment_list: { $all: modalities } }] : [])],
    }, { _id: 0, account_id: 1, id: 1, name_ar: 1, name_en: 1, home_visit_supported: 1, rating_avg: 1, rating_count: 1, logo: 1 }).limit(50).lean();
    // each centre's own total for the requested scans (its price per scan, a missing one at the catalogue price); null when some scan has no price at all
    const prices = await ownPrices(this.svcModel.db as never, 'radiology', (profiles as any[]).map((p) => p.account_id), services as any[]);
    return (profiles as any[]).map((profile) => {
      const own = prices.get(profile.account_id);
      const price = (services as any[]).reduce<number | null>((sum, svc: any) => {
        const one = own?.get(svc.id) ?? (typeof svc.price === 'number' && svc.price > 0 ? svc.price : null);
        return sum === null || one === null ? null : sum + one;
      }, 0);
      return {
        id: profile.account_id, facility_id: profile.id, name: profile.name_ar || profile.name_en,
        homeVisitAvailable: Boolean(profile.home_visit_supported),
        rating: profile.rating_count > 0 ? profile.rating_avg : null, logo: profile.logo || null,
        price, currency: 'SAR',
      };
    });
  }

  // #624 carousel: popular approved scans, each with the approved centers equipped for it (the
  // center's equipment_list holds the scan id or its modality, the rule compatibleProviders uses).
  async getCarousel(modality?: string, limit = 20) {
    const lim = Math.min(Math.max(Number.isFinite(limit) ? limit : 20, 1), 50);
    const q: any = { is_deleted: false, active: true, public_eligibility: true, medical_review_status: 'approved' };
    if (modality) q.modality = String(modality);
    const services: any[] = await this.svcModel.find(q, { _id: 0, id: 1, name_ar: 1, name_en: 1, modality: 1, body_part: 1, short_code: 1, price: 1, image_url: 1 })
      .sort({ popularity: -1, name_ar: 1 }).limit(lim).lean();
    const centers: any[] = await this.profileModel.find({
      type: { $in: ['radiology', 'hospital'] }, status: 'active', public_eligibility: true, medical_review_status: 'approved', account_id: { $exists: true, $ne: null },
    }, { _id: 0, account_id: 1, name_ar: 1, name_en: 1, logo: 1, rating_avg: 1, rating_count: 1, equipment_list: 1 }).lean();
    return services.map((svc) => {
      const fit = centers.filter((p) => {
        const eq: unknown[] = Array.isArray(p.equipment_list) ? p.equipment_list : [];
        return eq.includes(svc.id) || (!!svc.modality && eq.includes(svc.modality));
      }).sort((a, b) => (b.rating_count > 0 ? b.rating_avg : 0) - (a.rating_count > 0 ? a.rating_avg : 0));
      return { ...svc, providers_count: fit.length, providers: fit.slice(0, 5).map(publicProvider) };
    });
  }

  // #631 price comparison: each approved centre's own price for this scan - its own per-scan choice, else its capability row, else the price it registered with - with whether it
  // takes insurance and does home visits FOR THIS SCAN. Centres with no price for the scan are not listed.
  async priceComparison(serviceId: string) {
    const svc: any = await this.svcModel.findOne({ id: { $eq: String(serviceId) }, is_deleted: false, active: true, public_eligibility: true, medical_review_status: 'approved' }, { _id: 0, id: 1, name_ar: 1, name_en: 1, modality: 1, body_part: 1, short_code: 1, price: 1 }).lean();
    if (!svc) throw new NotFoundException('service_not_found');
    if (!svc.modality) return { service_id: svc.id, name_ar: svc.name_ar, name_en: svc.name_en, catalog_price: svc.price ?? null, offers: [] };
    const offers = ((await loadOffers(this.svcModel.db as never, 'radiology', [svc])).get(svc.id) ?? []).filter((o) => o.price !== null);
    // contrast is a fact of the centre's capability row for this scan (like turnaround_hours in the labs comparison); no row, no claim
    const lc = (v: unknown) => String(v ?? '').trim().toLowerCase();
    const caps: any[] = offers.length ? await this.svcModel.db.collection('provider_capabilities_radiology').find({
      available: true, provider_account_id: { $in: offers.map((o) => o.provider.id) },
    }, { projection: { _id: 0, provider_account_id: 1, contrast_supported: 1, service_id: 1, scan_type: 1, body_part: 1 } }).toArray() : [];
    const contrast = new Map<string, boolean>(caps
      .filter((c) => typeof c.contrast_supported === 'boolean' && (c.service_id ? c.service_id === svc.id : lc(c.scan_type) === lc(svc.modality) && (!svc.body_part || lc(c.body_part) === lc(svc.body_part))))
      .map((c) => [c.provider_account_id, c.contrast_supported]));
    return {
      service_id: svc.id, name_ar: svc.name_ar, name_en: svc.name_en, catalog_price: svc.price ?? null,
      offers: offers.map((o) => ({ provider: o.provider, price: o.price as number, currency: o.currency, contrast_supported: contrast.get(o.provider.id) ?? false, insurance_covered: o.insurance, premises: o.premises, home: o.home }))
        .sort((a, b) => a.price - b.price),
    };
  }

  async book(user: any, body: any) {
    // Only the approved catalog decides what is booked and what it costs; the body names the scan and center.
    const serviceId = typeof body?.service_id === 'string' ? body.service_id : '';
    if (!serviceId || serviceId.length > 128) throw new BadRequestException('service_id_required');
    const svc: any = await this.getById(serviceId).catch(() => null);
    if (!svc) throw new BadRequestException('service_not_available');
    const isAdmin = ['admin', 'super_admin', 'system'].includes(user?.role);
    let providerId = typeof body?.provider_account_id === 'string' ? body.provider_account_id : '';
    // an ordering quote names its providers by profile id: resolve it to the account the booking belongs to
    if (!providerId && typeof body?.provider_id === 'string' && body.provider_id) {
      const profile: any = await this.profileModel.findOne({ id: { $eq: body.provider_id } }, { _id: 0, account_id: 1 }).lean();
      providerId = typeof profile?.account_id === 'string' ? profile.account_id : '';
      if (!providerId) throw new BadRequestException('provider_not_found');
    }
    if (!providerId && !isAdmin) throw new BadRequestException('provider_account_id_required');
    if (providerId && !isAdmin) {
      // a centre may perform the scan by its equipment, or by having declared it in its ordering catalogue (what a quote lists)
      const ok = (await this.compatibleProviders([svc.id])).some((p: any) => p.id === providerId)
        || !!(await this.svcModel.db.collection('provider_ordering_items').findOne({ provider_account_id: providerId, service_kind: 'radiology', catalog_id: svc.id, available: { $ne: false } }));
      if (!ok) throw new BadRequestException('provider_cannot_perform_scan');
    }
    const when = new Date(String(body?.scheduled_at || ''));
    if (isNaN(when.getTime())) throw new BadRequestException('scheduled_at_required');
    if (when.getTime() < Date.now() - 5 * 60_000) throw new BadRequestException('slot_expired');
    const location = ['home'].includes(String(body?.location_type)) ? 'home' : 'facility';
    if (location === 'home' && !svc.home_visit_supported) throw new BadRequestException('scan_not_home_eligible');
    const pm = String(body?.payment_method || 'cash').toLowerCase();
    if (!['cash', 'card', 'insurance'].includes(pm)) throw new BadRequestException('invalid payment_method');
    if (location === 'home') assertPaymentMethod(pm, 'home_visit');
    const documents: any[] = Array.isArray(body?.documents) ? body.documents.map((d: any) => ({ kind: String(d?.kind || ''), url_or_b64: String(d?.url_or_b64 || ''), filename: d?.filename, uploaded_at: new Date() })) : [];
    // Home rule (mirror labs): insurance + home requires uploaded doctor_request OR preauth.
    if (location === 'home' && pm === 'insurance' && !documents.some((d) => d.kind === 'doctor_request' || d.kind === 'preauth')) {
      throw new BadRequestException('insurance_home_requires_doctor_request_or_preauth');
    }
    // S4 duplicate-booking prevention: idempotent replay for double-tap/retry within 3 minutes
    const dupe = await this.bkgModel.findOne({
      patient_id: { $eq: user.id }, 'items.service_id': { $eq: svc.id },
      createdAt: { $gte: new Date(Date.now() - 3 * 60_000) },
      state: { $nin: [RadiologyBookingState.CANCELLED, RadiologyBookingState.REPORT_READY] },
    }).lean();
    if (dupe) return dupe;
    // the chosen centre's own price for this scan (its choice, its capability row, or what it registered with); the catalogue price only when it has none
    const ownPrice = providerId ? (await ownPrices(this.svcModel.db as never, 'radiology', [providerId], [svc])).get(providerId)?.get(svc.id) : undefined;
    const total = ownPrice ?? (Number(svc.price) || 0);
    if (!(total > 0)) throw new BadRequestException('service_price_not_set');
    const booking = await this.bkgModel.create({
      id: require('uuid').v4(),
      patient_id: user.id, patient_name: user.full_name, patient_phone: user.phone,
      items: [{ service_id: svc.id, name_ar: svc.name_ar, name_en: svc.name_en, modality: svc.modality, body_part: svc.body_part, price: total }],
      total, total_price: total,
      scan_type_code: svc.short_code, scan_name_ar: svc.name_ar, scan_name_en: svc.name_en,
      location_type: location, delivery_mode: location === 'home' ? 'MOBILE_HOME_VISIT' : 'IN_CENTER',
      provider_account_id: providerId || undefined,
      scheduled_at: when,
      payment_method: pm,
      insurance_status: pm === 'insurance' ? 'pending' : 'none',
      documents,
      state: RadiologyBookingState.NEW_REQUEST,
      state_history: [{ from: '', to: RadiologyBookingState.NEW_REQUEST, by_user_id: user.id, by_role: user.role, at: new Date() }],
      // P17-17.5: campaign attribution for the campaign report.
      attribution: pickAttribution(body) ?? undefined,
    });
    this.events.emit('radiology.new_booking', { bookingId: booking.id, patientId: user.id });
    // The provider hears about it too (bell row + push), as for labs and appointments; radiology.new_booking only notifies the patient.
    await this.engine.announceCreated({ kind: 'radiology', entity_id: booking.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, meta: { payment_method: pm } }).catch(() => undefined);
    return booking;
  }

  async mineFor(user: any) {
    // Older bookings may sit in the center store (patient_id = the user's Mongo _id).
    const me: any = await this.userModel.findOne({ id: user.id }, { _id: 1 }).lean();
    const [current, center] = await Promise.all([
      this.bkgModel.find({ patient_id: user.id }).sort({ createdAt: -1 }).lean(),
      me?._id ? this.centerBkgModel.find({ patient_id: me._id }).sort({ createdAt: -1 }).lean() : Promise.resolve([]),
    ]);
    const all = [...(current as any[]), ...(center as any[]).map((c) => ({ ...c, state: c.state || c.status }))]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return this.withNames(all);
  }

  /** Issue 1832: every line carries `names` and the booking `scan_names` (six languages), resolved from the catalogue by `service_id` in one query. */
  private async withNames(bookings: any[]) {
    const named = await withItemNames(bookings, (ids) => this.svcModel.find({ id: { $in: ids } }, NAME_PROJECTION).lean() as any);
    return named.map(withScanNames);
  }

  async getBooking(id: string, user: any) {
    const b = await this.bkgModel.findOne({ id }).lean() as any;
    if (!b) {
      // older center-store booking: findBooking applies its own participant check
      const c = await this.findBooking(id, user);
      if (!c) throw new NotFoundException();
      const o = c.toObject ? c.toObject() : c;
      return { ...o, state: o.state || o.status };
    }
    // the patient, the booked center (its detail screen refreshes after every action) or admin
    const isProvider = !!b.provider_account_id && b.provider_account_id === (user.account_id ?? user.id);
    if (b.patient_id !== user.id && !isProvider && user.role !== 'admin' && user.role !== 'super_admin') {
      throw new NotFoundException();
    }
    // Design parity (#1819): the technician's name and, once the report is published, the files the patient may open.
    const [named] = await this.withNames([b]);
    return { ...named, ...(isProvider ? reportApprovalFor(b, user.id) : {}), technician: await this.technicianView(b), report_files: b.patient_id === user.id ? await this.reportFilesView(b) : undefined };
  }

  /** The technician assigned to a booking: display name only (never the account id, phone or licence). */
  private async technicianView(b: any): Promise<{ name: string } | null> {
    if (!b?.technician_id) return null;
    const u: any = await this.userModel.findOne({ id: b.technician_id }, { _id: 0, full_name: 1, name: 1 }).lean();
    const name = [u?.full_name, u?.name].find((v) => typeof v === 'string' && v.trim());
    return name ? { name: name.trim().slice(0, 120) } : null;
  }

  /**
   * The report PDF, the DICOM study and the scan images of a PUBLISHED report, by storage id and kind. The bytes are read
   * with GET /storage/:id, which lets the booking's patient open exactly these objects (StorageService.radiologyPatientMayRead).
   */
  private async reportFilesView(b: any): Promise<Array<{ id: string; kind: 'report' | 'dicom' | 'image'; mime: string | null; name: string | null }> | null> {
    if ((b?.state || b?.status) !== RadiologyBookingState.REPORT_READY) return null;
    const wanted: Array<{ id: string; kind: 'report' | 'dicom' | 'image' }> = [
      ...(b.report_storage_object_id ? [{ id: String(b.report_storage_object_id), kind: 'report' as const }] : []),
      ...(b.dicom_storage_object_id ? [{ id: String(b.dicom_storage_object_id), kind: 'dicom' as const }] : []),
      ...(Array.isArray(b.scan_storage_object_ids) ? b.scan_storage_object_ids.slice(0, 50).map((id: unknown) => ({ id: String(id), kind: 'image' as const })) : []),
    ];
    if (!wanted.length) return [];
    const objects: any[] = await this.storageObjects.find({ id: { $in: wanted.map((w) => w.id) }, deleted: false }, { _id: 0, id: 1, mime: 1, original_name: 1 }).lean();
    const byId = new Map(objects.map((o) => [o.id, o]));
    return wanted.filter((w) => byId.has(w.id)).map((w) => ({ ...w, mime: byId.get(w.id).mime ?? null, name: byId.get(w.id).original_name ?? null }));
  }

  async cancel(id: string, user: any) {
    return this.transition(id, RadiologyBookingState.CANCELLED, user, 'Cancelled by user');
  }

  async updateInsuranceStatus(id: string, user: any, status: string, reason?: string) {
    const b = await this.findBooking(id, user);
    if (!b) throw new NotFoundException();
    // A provider can say "rejected" (with the reason the patient is shown) but can never approve their own booking here: an approval,
    // full or partial, comes from the insurer through the coverage decision (which records the reference and sets the copay), because
    // approved insurance lets the generic accept pass without the patient paying their share.
    if (!['rejected', 'pending', 'none'].includes(String(status))) throw new BadRequestException('insurance_approval_requires_coverage_decision');
    if (status === 'rejected' && !String(reason || '').trim()) throw new BadRequestException('rejection_reason_required');
    b.insurance_status = status;
    if (reason) b.rejection_reason = reason;
    await b.save();
    return b;
  }

  async addDocument(id: string, user: any, body: any) {
    const b = await this.findBooking(id, user);
    if (!b) throw new NotFoundException();
    b.documents.push({ ...body, uploaded_at: new Date() });
    await b.save();
    return b;
  }

  async listForProvider(user: any, status?: string) {
    const q: any = { provider_account_id: { $eq: user.account_id ?? user.id } };
    if (status) q.state = { $eq: status };
    const rows = await this.bkgModel.find(q).sort({ scheduled_at: 1 }).lean();
    // R7 (13.R4): a request nobody has accepted shows the area only, not the patient's phone and exact address.
    return (rows as any[]).map((r) => ({ ...withholdLegacyBeforeAcceptance(r, [RadiologyBookingState.NEW_REQUEST, RadiologyBookingState.PENDING]), ...reportApprovalFor(r, user.id) }));
  }

  async assignTechnician(id: string, user: any, body: any) {
    const b = await this.findBooking(id, user);
    if (!b) throw new NotFoundException();
    b.technician_id = body.technician_id;
    await b.save();
    return b;
  }

  async adminListAll(opts: any) {
    const q: any = {};
    if (opts.status) q.state = { $eq: opts.status };
    if (opts.insurance_status) q.insurance_status = { $eq: opts.insurance_status };
    const limit = opts.limit || 50;
    return this.bkgModel.find(q).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async myReports(user: any) {
    // Center bookings store patient_id as the user's Mongo _id; legacy stores the
    // app-level UUID — resolve both forms before unioning.
    const me: any = await this.userModel.findOne({ id: user.id }, { _id: 1 }).lean();
    const ids: any[] = me?._id ? [user.id, me._id] : [user.id];
    const [legacy, center] = await Promise.all([
      this.bkgModel.find({ patient_id: { $in: ids }, state: RadiologyBookingState.REPORT_READY }, { _id: 0, __v: 0 }).lean(),
      this.centerBkgModel.find({ patient_id: { $in: ids }, status: RadiologyBookingState.REPORT_READY }, { _id: 0, __v: 0 }).lean(),
    ]);
    return [...(legacy as any[]), ...(center as any[])].sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  }

  // --- Admin Catalog CRUD ---
  async createCatalog(user: any, body: any) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    const doc = await this.svcModel.create({ ...pick(body, RADIOLOGY_CATALOG_FIELDS), ...reviewUpdate(body?.medical_review_status, user.id), id: require('uuid').v4() });
    await invalidateCatalogCache(this.redis, 'cache:radiology-services:');
    return doc;
  }

  async updateCatalog(user: any, id: string, body: any) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    const updated = await this.svcModel.findOneAndUpdate({ id }, { $set: { ...pick(body, RADIOLOGY_CATALOG_FIELDS), ...reviewUpdate(body?.medical_review_status, user.id) } }, { new: true });
    if (!updated) throw new NotFoundException();
    await invalidateCatalogCache(this.redis, 'cache:radiology-services:');
    return updated;
  }

  /** Admin catalog editor: every item including unpublished ones (the public list only shows approved). */
  async adminCatalog(user: any) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    return this.svcModel.find({ is_deleted: { $ne: true } }, { _id: 0, __v: 0 }).sort({ medical_review_status: 1, popularity: -1, name_ar: 1 }).limit(1000);
  }

  async deleteCatalog(user: any, id: string) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    const deleted = await this.svcModel.findOneAndDelete({ id });
    if (!deleted) throw new NotFoundException();
    // Without this a deleted item stays in the patients' cached lists until the TTL runs out.
    await invalidateCatalogCache(this.redis, 'cache:radiology-services:');
    return { ok: true };
  }

  /** P6.0: medical-review decision — approve surfaces the item publicly. */
  async approveCatalogItem(user: any, id: string, approve: boolean) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    const updated = await this.svcModel.findOneAndUpdate(
      { id: { $eq: id } },
      { $set: reviewUpdate(approve ? 'approved' : 'rejected', user.id) },
      { new: true },
    );
    if (!updated) throw new NotFoundException();
    // Public lists are cached per query: without this an approved item stays hidden until the TTL.
    await invalidateCatalogCache(this.redis, 'cache:radiology-services:');
    this.events.emit({ type: approve ? 'catalog.service_approved' : 'catalog.service_disabled', entity_type: 'service', entity_id: id, actor_account_id: user.id, actor_role: 'admin', meta: { kind: 'radiology' } } as any);
    return updated;
  }

  async bulkApproveCatalog(user: any, ids: string[], approve: boolean) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    const list = (Array.isArray(ids) ? ids : []).filter((x) => typeof x === 'string' && x).slice(0, 200);
    if (!list.length) throw new BadRequestException('ids_required');
    const results: any[] = [];
    for (const itemId of list) {
      try {
        await this.approveCatalogItem(user, itemId, approve);
        results.push({ id: itemId, ok: true });
      } catch (e: any) {
        results.push({ id: itemId, ok: false, error: e?.message || 'failed' });
      }
    }
    return { ok: true, approve, results };
  }

  async adminForceState(user: any, id: string, targetState: RadiologyBookingState, note: string) {
    if (user.role !== 'admin') throw new ForbiddenException('admin_only');
    const b = await this.findBooking(id, user);
    if (!b) throw new NotFoundException();
    (b.state_history = b.state_history || []).push({ from: b.state, to: targetState, by_user_id: user.id, by_role: user.role, at: new Date(), note: `admin_forced: ${note}` });
    b.state = targetState;
    await b.save();
    return b;
  }



  async slotsForProvider(providerAccountId: string, dateStr: string, duration_minutes = 30) {
    // Validate duration: must be integer between 10 and 120
    const duration = parseInt(String(duration_minutes), 10);
    if (!Number.isInteger(duration) || duration < 10 || duration > 120) {
      throw new BadRequestException('duration must be an integer between 10 and 120 minutes');
    }

    const profile = await this.profileModel.findOne({
      account_id: providerAccountId,
      type: { $in: ['radiology', 'hospital'] },
      status: 'active',
      public_eligibility: true,
      medical_review_status: 'approved',
    }).lean();
    if (!profile) throw new NotFoundException('provider_not_found');
    // The centre's own approved availability schedule wins; a centre that never saved one keeps the opening hours of its profile.
    const settings: any = this.conn
      ? await this.conn.collection('provider_settings').findOne({ provider_id: { $eq: providerAccountId } }, { projection: { _id: 0, radiology_schedule: 1 } }).catch(() => null)
      : null;
    const ownSchedule: RadiologySchedule | null = Array.isArray(settings?.radiology_schedule?.working_days) ? settings.radiology_schedule : null;
    if (!ownSchedule && (!(profile as any).schedule_clinic || !(profile as any).schedule_clinic.length)) {
      return { date: dateStr, slots: [], reason: 'no_schedule' };
    }

    const date = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(date.getTime())) return { date: dateStr, slots: [], reason: 'invalid_date' };

    const dow = date.getUTCDay();
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const fullDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    const dayMatches = (d: any) => {
      const v = String(d ?? '').toLowerCase();
      return v === 'all' || v === String(dow) || v === dayKeys[dow] || v === fullDays[dow];
    };

    const windows = ownSchedule ? radiologyWindows(ownSchedule, dow) : ((profile as any).schedule_clinic || []).filter((w) => w && !w.closed && dayMatches(w.day)).flatMap((w) => [
      ...(w.open && w.close ? [{ open: w.open, close: w.close }] : []),
      ...(w.open_evening && w.close_evening ? [{ open: w.open_evening, close: w.close_evening }] : []),
    ]);

    if (!windows.length) return { date: dateStr, slots: [], reason: 'closed' };

    const baseDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const slots: { id: string; start: string; end: string; label: string; available: boolean }[] = [];
    const seen = new Set<string>();
    const now = Date.now();

    for (const w of windows) {
      const [oh, om] = w.open.split(':').map(Number);
      const [ch, cm] = w.close.split(':').map(Number);
      const openTs = new Date(baseDate.getTime() + oh * 3600_000 + om * 60_000);
      let closeTs = new Date(baseDate.getTime() + ch * 3600_000 + cm * 60_000);
      if (closeTs.getTime() <= openTs.getTime()) closeTs = new Date(closeTs.getTime() + 24 * 3600_000);
      for (let t = openTs.getTime(); t + duration * 60_000 <= closeTs.getTime(); t += duration * 60_000) {
        const start = new Date(t);
        const end = new Date(t + duration * 60_000);
        if (start.getTime() < now + 15 * 60_000) continue;
        const slotId = start.toISOString();
        if (seen.has(slotId)) continue;
        seen.add(slotId);
        slots.push({ id: slotId, start: slotId, end: end.toISOString(), label: slotId.substring(11, 16), available: true });
      }
    }
    slots.sort((x, y) => x.start.localeCompare(y.start));
    if (slots.length === 0) return { date: dateStr, slots: [], reason: 'no_slots' };

    // Mark booked slots as unavailable
    const startOfDay = new Date(baseDate.getTime());
    const endOfDay = new Date(baseDate.getTime() + 24 * 3600_000);
    const booked = await this.bkgModel.find({
      provider_account_id: providerAccountId,
      scheduled_at: { $gte: startOfDay, $lt: endOfDay },
      state: { $nin: ['CANCELLED', 'REPORT_READY'] },
    }).select({ scheduled_at: 1 }).lean();
    const bookedSet = new Set(booked.map((b: any) => new Date(b.scheduled_at).toISOString()));
    for (const s of slots) {
      if (bookedSet.has(s.start)) s.available = false;
    }
    return { date: dateStr, slots };
  }

}
