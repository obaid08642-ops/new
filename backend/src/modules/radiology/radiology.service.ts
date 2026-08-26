import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { RadiologyService, RadiologyBookingState, RADIOLOGY_BOOKING_TRANSITIONS } from '../../schemas/radiology.schema';
import { RadiologyBooking } from './schemas/radiology-booking.schema';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { EventEmitter2 } from '@nestjs/event-emitter';

const ALLOWED_ROLES_PROVIDER = ['radiology', 'admin', 'hospital'];

@Injectable()
export class RadiologyOpsService {
  constructor(
    @InjectModel('RadiologyService') private svcModel: Model<any>,
    @InjectModel('RadiologyBooking') private bkgModel: Model<any>,
    @InjectModel('RadiologyCenterBooking') private centerBkgModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('LabResult') private resultModel: Model<any>,
    @InjectModel('StorageObject') private storageObjects: Model<any>,
    @InjectConnection() private connection: Connection,
    private engine: WorkflowEngineService,
    private events: EventEmitter2,
  ) {}

  // ──────────────────────────────────────────────
  // PILLAR 1: State Transition (validated)
  // ──────────────────────────────────────────────
  /** Bookings may live in either collection (legacy or center) — unify lookup. */
  private async findBooking(id: string): Promise<any> {
    return (await this.bkgModel.findOne({ id })) || (await this.centerBkgModel.findOne({ id }));
  }

  private async privateProviderStorage(id: string, user: any, requirePdf = false): Promise<any> {
    const object: any = await this.storageObjects.findOne({ id, owner_account_id: user.id, visibility: 'private', deleted: false }).lean();
    if (!object) throw new ForbiddenException('private_storage_object_not_owned');
    if (requirePdf && object.mime !== 'application/pdf') throw new BadRequestException('report_pdf_storage_object_required');
    return object;
  }

  async transition(id: string, targetState: RadiologyBookingState, user: any, note?: string) {
    const b = await this.findBooking(id);
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
    b.state_history = [...(b.state_history || []), { from: current, to: targetState, by_user_id: user.id, by_role: user.role, at: new Date(), note }];
    b.state = targetState;
    if (b.status !== undefined) b.status = targetState;
    b.markModified?.('state_history');
    await b.save();
    // MODULE 16: Emit notification
    this.events.emit('radiology.state_changed', { bookingId: id, state: targetState, patientId: b.patient_id });
    return b;
  }

  // ──────────────────────────────────────────────
  // PILLAR 5: Check-In → ARRIVED_CHECKIN
  // ──────────────────────────────────────────────
  async checkin(id: string, user: any) {
    const b = await this.findBooking(id);
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
    const b = await this.findBooking(id);
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
    const b = await this.findBooking(id);
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
    const b = await this.findBooking(id);
    if (!b) throw new NotFoundException();
    if (body.pdf_url || body.dicom_url || body.image_urls) throw new BadRequestException('raw_report_urls_not_allowed');
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
    const b = await this.findBooking(id);
    if (!b) throw new NotFoundException();
    if (!b.report_storage_object_id) throw new BadRequestException('secure_report_storage_object_required_before_review');
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
    const b = await this.findBooking(id);
    if (!b) throw new NotFoundException();
    if ((b.state || b.status) !== RadiologyBookingState.UNDER_REVIEW) throw new BadRequestException('Report must be UNDER_REVIEW to approve');
    b.report_status = 'ready';
    b.report_approved_by = user.id;
    b.report_approved_at = new Date();
    (b.state_history = b.state_history || []).push({ from: b.state, to: RadiologyBookingState.REPORT_READY, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'Report approved and published by radiologist' });
    b.state = RadiologyBookingState.REPORT_READY;
    if (b.status !== undefined) b.status = RadiologyBookingState.REPORT_READY as any;
    b.markModified?.('state_history');
    await b.save();
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
  async publishReport(id: string, body: any, user: any) {
    return this.approveReport(id, user);
  }

  // ──────────────────────────────────────────────
  // PILLAR 4: Insurance NPHIES Gatekeeper
  // ──────────────────────────────────────────────
  async processInsuranceApproval(id: string, user: any, body: { approval_code: string; copay: number }) {
    const b = await this.findBooking(id);
    if (!b) throw new NotFoundException();
    // State machine: insurance approval is only valid during the insurance phase —
    // approving on an in-progress/completed booking would rewind it to CONFIRMED.
    const insurancePhase = [RadiologyBookingState.NEW_REQUEST, RadiologyBookingState.PENDING_INSURANCE, RadiologyBookingState.WAITING_COPAY];
    if (!insurancePhase.includes(b.state as RadiologyBookingState)) {
      throw new BadRequestException(`invalid_transition_${b.state}_to_insurance_approval`);
    }
    b.insurance_approval_code = body.approval_code;
    b.insurance_copay = body.copay;
    b.insurance_status = 'approved';
    const nextState = body.copay > 0 ? RadiologyBookingState.WAITING_COPAY : RadiologyBookingState.CONFIRMED;
    (b.state_history = b.state_history || []).push({ from: b.state, to: nextState, by_user_id: user.id, by_role: user.role, at: new Date(), note: `NPHIES approved. Code: ${body.approval_code}. Copay: ${body.copay} SAR` });
    b.state = nextState;
    await b.save();
    this.events.emit('radiology.insurance_approved', { bookingId: id, patientId: b.patient_id, copay: body.copay });
    return b;
  }

  // ──────────────────────────────────────────────
  // MODULE 14: Reschedule Booking
  // ──────────────────────────────────────────────
  async rescheduleBooking(id: string, user: any, body: { new_date: string; reason: string }) {
    const b = await this.findBooking(id);
    if (!b) throw new NotFoundException();
    const oldDate = b.scheduled_at;
    b.scheduled_at = new Date(body.new_date);
    b.reschedule_reason = body.reason;
    (b.state_history = b.state_history || []).push({ from: b.state, to: b.state, by_user_id: user.id, by_role: user.role, at: new Date(), note: `Rescheduled from ${oldDate} to ${b.scheduled_at}. Reason: ${body.reason}` });
    await b.save();
    this.events.emit('radiology.rescheduled', { bookingId: id, patientId: b.patient_id, newDate: b.scheduled_at });
    return b;
  }

  // ──────────────────────────────────────────────
  // MODULE 9: Tracking / Timeline for patient
  // ──────────────────────────────────────────────
  async getTracking(id: string, user: any) {
    const b: any = await this.bkgModel.findOne({ id }).lean();
    if (!b) throw new NotFoundException();
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
  async catalogDeltaRequest(user: any, body: any) {
    // Sends to approval workflow — patient sees nothing until approved
    this.events.emit('radiology.catalog_delta', { providerAccountId: user.account_id ?? user.id, changes: body, requestedBy: user.id });
    return { ok: true, message: 'Delta request submitted for admin approval. Changes will not appear to patients until approved.' };
  }

  // MODULE 12: Patient confirms preparation
  async confirmPreparation(id: string, user: any) {
    const b = await this.findBooking(id);
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
    if (opts.modality) q.modality = opts.modality;
    if (opts.body_part) q.body_part = opts.body_part;
    if (opts.search) q.$text = { $search: opts.search };
    if (opts.home_only) q.home_visit_supported = true;
    return this.svcModel.find(q).sort({ popularity: -1 }).lean();
  }

  async modalities() {
    return this.svcModel.distinct('modality', { is_deleted: false, active: true, public_eligibility: true, medical_review_status: 'approved' });
  }

  async getById(id: string) {
    // The legacy `id` field on catalog docs is stored as binary garbage, so
    // public detail lookup must use `_id` (or human `short_code`) instead.
    const base = { is_deleted: false, active: true, public_eligibility: true, medical_review_status: 'approved' } as const;
    const or: Record<string, unknown>[] = [{ short_code: id }];
    if (Types.ObjectId.isValid(id)) or.unshift({ _id: new Types.ObjectId(id) });
    const svc = await this.svcModel.findOne({ ...base, $or: or }).lean();
    if (!svc) throw new NotFoundException();
    return svc;
  }

  async book(user: any, body: any) {
    // S4 duplicate-booking prevention: idempotent replay for double-tap/retry within 3 minutes
    if (body?.service_id) {
      const dupe = await this.bkgModel.findOne({
        patient_id: user.id,
        service_id: body.service_id,
        createdAt: { $gte: new Date(Date.now() - 3 * 60_000) },
        state: { $nin: [RadiologyBookingState.CANCELLED, RadiologyBookingState.REPORT_READY] },
      }).lean();
      if (dupe) return dupe;
    }
    // Family on-behalf booking: record the member this booking is for
    let bookedForMemberId: string | undefined;
    if (body?.member_id && String(body.member_id) !== String(user.id)) {
      const group: any = await this.connection.db.collection('family_groups').findOne({
        is_deleted: { $ne: true },
        'members.user_id': { $all: [String(user.id), String(body.member_id)] },
      });
      if (!group) throw new ForbiddenException('patient is not a member of your family group');
      if (group.owner_id !== String(user.id)) {
        const me = (group.members || []).find((m: any) => m.user_id === String(user.id));
        if (!me?.permissions?.includes('booking')) {
          throw new ForbiddenException('you do not have the booking permission for this member');
        }
      }
      bookedForMemberId = String(body.member_id);
    }
    // Whitelist client-settable fields — a raw spread would let callers inject
    // payment_status/state/insurance mirrors directly.
    const paymentMethod = ['cash', 'card', 'insurance'].includes(String(body?.payment_method)) ? body.payment_method : 'cash';
    const items = Array.isArray(body?.items) && body.items.length
      ? body.items.slice(0, 20)
      : (body?.service_id ? [{ service_id: String(body.service_id), qty: 1 }] : []);
    const booking = await this.bkgModel.create({
      items,
      service_id: body?.service_id ? String(body.service_id) : undefined,
      scheduled_at: body?.scheduled_at ? new Date(body.scheduled_at) : new Date(),
      location_type: body?.home_collection === true || body?.location_type === 'home' ? 'home' : 'facility',
      facility_id: body?.facility_id ? String(body.facility_id) : undefined,
      provider_account_id: body?.provider_account_id ? String(body.provider_account_id) : undefined,
      address: body?.collection_address ?? body?.address ?? undefined,
      notes: body?.notes ? String(body.notes).slice(0, 1000) : undefined,
      payment_method: paymentMethod,
      insurance_provider: body?.insurance_provider ? String(body.insurance_provider).slice(0, 120) : undefined,
      insurance_member_id: body?.insurance_member_id ? String(body.insurance_member_id).slice(0, 120) : undefined,
      insurance_status: paymentMethod === 'insurance' ? 'pending' : 'none',
      booked_for_member_id: bookedForMemberId,
      id: require('uuid').v4(),
      patient_id: user.id,
      state: RadiologyBookingState.NEW_REQUEST,
    });
    this.events.emit('radiology.new_booking', { bookingId: booking.id, patientId: user.id });
    return booking;
  }

  async mineFor(user: any) {
    return this.bkgModel.find({ patient_id: user.id }).sort({ createdAt: -1 }).lean();
  }

  async getBooking(id: string, user: any) {
    const b = await this.bkgModel.findOne({ id }).lean();
    if (!b) throw new NotFoundException();
    return b;
  }

  async cancel(id: string, user: any) {
    return this.transition(id, RadiologyBookingState.CANCELLED, user, 'Cancelled by user');
  }

  async updateInsuranceStatus(id: string, user: any, status: string, reason?: string) {
    const b = await this.findBooking(id);
    if (!b) throw new NotFoundException();
    b.insurance_status = status;
    if (reason) b.rejection_reason = reason;
    await b.save();
    return b;
  }

  async addDocument(id: string, user: any, body: any) {
    const b = await this.findBooking(id);
    if (!b) throw new NotFoundException();
    b.documents.push({ ...body, uploaded_at: new Date() });
    await b.save();
    return b;
  }

  async listForProvider(user: any, status?: string) {
    const q: any = { provider_account_id: user.account_id ?? user.id };
    if (status) q.state = status;
    return this.bkgModel.find(q).sort({ scheduled_at: 1 }).lean();
  }

  async assignTechnician(id: string, user: any, body: any) {
    const b = await this.findBooking(id);
    if (!b) throw new NotFoundException();
    b.technician_id = body.technician_id;
    await b.save();
    return b;
  }

  async adminListAll(opts: any) {
    const q: any = {};
    if (opts.status) q.state = opts.status;
    if (opts.insurance_status) q.insurance_status = opts.insurance_status;
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
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.svcModel.create({ ...body, id: require('uuid').v4() });
  }

  async updateCatalog(user: any, id: string, body: any) {
    if (user.role !== 'admin') throw new ForbiddenException();
    const updated = await this.svcModel.findOneAndUpdate({ id }, { $set: body }, { new: true });
    if (!updated) throw new NotFoundException();
    return updated;
  }

  async deleteCatalog(user: any, id: string) {
    if (user.role !== 'admin') throw new ForbiddenException();
    const deleted = await this.svcModel.findOneAndDelete({ id });
    if (!deleted) throw new NotFoundException();
    return { ok: true };
  }

  async adminForceState(user: any, id: string, targetState: RadiologyBookingState, note: string) {
    if (user.role !== 'admin') throw new ForbiddenException('admin_only');
    const b = await this.findBooking(id);
    if (!b) throw new NotFoundException();
    (b.state_history = b.state_history || []).push({ from: b.state, to: targetState, by_user_id: user.id, by_role: user.role, at: new Date(), note: `admin_forced: ${note}` });
    b.state = targetState;
    await b.save();
    return b;
  }
}
