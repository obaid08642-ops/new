import { MedicalAccessLogService, logMedicalRead } from '../../common/pdpl-compliance.module';
import { escapeRegex } from '../../common/slug.util';
import { pickAttribution } from '../../common/attribution';
import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException, Logger, Inject, Optional } from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Appointment, AppointmentDocument, APPT_STATES, APPT_TRANSITIONS, ApptState, ServiceType } from '../../schemas/appointment.schema';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { UserRole, ProviderType, ProviderStatus, SPECIALTY_MASTER } from '../../common/enums';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { InsuranceFlowService } from '../insurance-engine/insurance-engine.module';
import { SlotLocksService } from '../slot-locks/slot-locks.module';
import { AppointmentRepository } from "./repositories/appointment.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { hasEffectiveRole } from '../../common/auth.guard';
import { DEFAULT_REFUND_POLICY } from '../refund-policy/refund-policy.defaults';
import { KillSwitchesService } from '../kill-switches/kill-switches.service';
import { isOnlineConsultation } from '../chat/consultation-window';
import { assertTelehealthConsent } from '../legal/telehealth-consent';

/** Platform fee schedule (SAR). Move to DB/config when admin dashboard supports it. */
const PLATFORM_FEES = {
  service_fee: 15,           // flat service fee for all bookings
  home_visit_fee: 100,       // additional fee for home visits
  transportation_fee: 50,    // transportation surcharge for home visits
};

/**
 * Appointment lifecycle service.
 * - State machine: PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED
 * - Card payments: stay PENDING until payment.completed webhook confirms.
 * - Cash / insurance: auto-confirm on creation (instant booking).
 */
@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @Inject('AppointmentRepository') private apptModel: AppointmentRepository,
    @Inject('ProviderProfileRepository') private providerModel: ProviderProfileRepository,
    @InjectConnection() private connection: Connection,
    private events: EventEmitter2,
    private engine: WorkflowEngineService,
    private insurance: InsuranceFlowService,
    @Optional() private locks?: SlotLocksService,
    @Optional() private readonly killSwitches?: KillSwitchesService,
    @Optional() private readonly accessLog?: MedicalAccessLogService,
  ) {}

  /**
   * Family on-behalf check: the booker must share a family group with the
   * patient and either own the group or hold the 'booking' permission.
   */
  private async assertFamilyBookingRight(bookerId: string, patientId: string) {
    const group: any = await this.connection.db.collection('family_groups').findOne({
      is_deleted: { $ne: true },
      'members.user_id': { $all: [bookerId, patientId] },
    });
    if (!group) throw new ForbiddenException('patient is not a member of your family group');
    if (group.owner_id === bookerId) return;
    const me = (group.members || []).find((m: any) => m.user_id === bookerId);
    if (!me?.permissions?.includes('booking')) {
      throw new ForbiddenException('you do not have the booking permission for this member');
    }
  }

  /** ===== Create ===== */

  /**
   * 660: resolve a prescription line to its catalogue medicine id by exact name
   * (any stored language). Null when the line names no catalogue item.
   */
  private async resolvePrescriptionMedicineId(name: unknown): Promise<string | null> {
    const needle = String(name || '').trim();
    if (!needle) return null;
    try {
      const col = (this.connection as any)?.collection?.('medicines') ?? (this.connection as any)?.db?.collection?.('medicines');
      if (!col) return null;
      // One exact (case-insensitive) name lookup, never a scan of the whole ~21k catalogue in memory.
      const exact = new RegExp(`^${escapeRegex(needle)}$`, 'i');
      const or = ['name_ar', 'name_en', 'translations.ur.name', 'translations.hi.name', 'translations.bn.name', 'translations.tl.name', 'translations.fil.name']
        .map((field) => ({ [field]: exact }));
      const hit: any = await col.findOne({ $or: or }, { projection: { _id: 0, id: 1 } });
      return hit?.id || null;
    } catch {
      return null;
    }
  }

  /** 661/683: the consultation outcome's lab + radiology referrals, if the doctor issued any. */
  private async outcomeReferrals(appt: any): Promise<{ lab_tests: string[]; radiology_scans: string[] } | null> {
    try {
      const col = (this.connection as any)?.collection?.('encounterreferrals') ?? (this.connection as any)?.db?.collection?.('encounterreferrals');
      if (!col || !appt?._id) return null;
      const ref: any = await col.findOne({ appointment_id: appt._id });
      if (!ref) return null;
      return { lab_tests: ref.requested_lab_tests || [], radiology_scans: ref.requested_radiology_scans || [] };
    } catch {
      return null;
    }
  }

  /**
   * D-38: the first online (video) consultation needs the current telehealth_consent (legal/telehealth-consent.ts).
   * Throws telehealth_consent_required when it has not been accepted. When the deployment publishes no such policy
   * (or the connection double has no collections), booking proceeds as before.
   */
  private async assertTelehealthConsent(accountId: string): Promise<void> {
    await assertTelehealthConsent(this.connection, accountId);
  }

  async create(user: any, body: {
    doctor_id: string;
    service_type: ServiceType;
    slot_start: string; // ISO
    duration_minutes?: number;
    patient_notes?: string;
    symptoms?: string[];
    visit_location?: { lat: number; lng: number; address: string };
    payment_method?: 'cash' | 'card' | 'insurance';
    insurance_provider?: string;
    insurance_member_id?: string;
    for_member_id?: string; // family booking on behalf of a member
    slot_lock_id?: string; // optional 10-min hold from POST /slot-locks/reserve (consumed on success, released on failure)
    follow_up_of?: string; // follow-up appointment link to original appointment (same patient and doctor)
  }) {
    if (!body?.doctor_id || !body?.service_type || !body?.slot_start) {
      throw new BadRequestException('doctor_id, service_type, slot_start required');
    }
    // Issue 955: the admin kill switch for remote consultations refuses new video/voice bookings before anything is held.
    if (isOnlineConsultation({ service_type: body.service_type })) await this.killSwitches?.assertOn('online_consultations');
    // On-behalf family booking: patient becomes the member, booker is audited
    let patientId: string = user.id;
    let bookedBy: string | undefined;
    if (body.for_member_id && body.for_member_id !== user.id) {
      await this.assertFamilyBookingRight(user.id, body.for_member_id);
      patientId = body.for_member_id;
      bookedBy = user.id;
    }
    // Enforce Nabd payment policy: online → card only; home → card/insurance; clinic → all
    const pm = body.payment_method || (body.service_type === 'clinic' ? 'cash' : 'card');
    const svcCtx = body.service_type === 'video' ? 'online_consultation' : body.service_type === 'home' ? 'home_visit' : 'in_clinic';
    const allowed: Record<string, string[]> = {
      online_consultation: ['card'],
      home_visit: ['card', 'insurance'],
      in_clinic: ['cash', 'card', 'insurance'],
    };
    if (!allowed[svcCtx].includes(pm)) {
      throw new BadRequestException(`payment_method_${pm}_not_allowed_for_${svcCtx}`);
    }
    const doctor = await this.providerModel.findOne({ id: body.doctor_id, type: ProviderType.DOCTOR, status: ProviderStatus.ACTIVE });
    if (!doctor) throw new NotFoundException('doctor_not_found');
    if (!doctor.consultation_modes?.includes(body.service_type)) {
      throw new BadRequestException(`doctor does not support service_type=${body.service_type}`);
    }
    // D-38: the first online (video) consultation needs telehealth_consent. Skipped when
    // the deployment configures no such policy, so unit doubles without collections keep working.
    // The account that books (and accepts in the app or on the web) is the one asked: a guardian booking for a family
    // member accepts for that visit, since the member has no session of their own to accept with.
    if (body.service_type === 'video') {
      await this.assertTelehealthConsent(user.id);
    }
    const slotStart = new Date(body.slot_start);
    if (isNaN(slotStart.getTime()) || slotStart.getTime() < Date.now() + 5 * 60_000) {
      throw new BadRequestException('slot_start must be in the future');
    }
    // 15-minute granularity rule
    if (slotStart.getMinutes() % 15 !== 0 || slotStart.getSeconds() !== 0 || slotStart.getMilliseconds() !== 0) {
      throw new BadRequestException('slot_start must be exactly on a 15-minute boundary (e.g., 00, 15, 30, 45)');
    }

    const duration = body.duration_minutes || 30;
    const slotEnd = new Date(slotStart.getTime() + duration * 60_000);
    const paddedEnd = new Date(slotEnd.getTime() + 5 * 60_000); // 5-minute buffer between appointments

    // Overlap Prevention Rule
    const overlapping = await this.apptModel.findOne({
      doctor_id: doctor.id,
      status: { $in: [APPT_STATES.PENDING, APPT_STATES.CONFIRMED, APPT_STATES.CHECKED_IN, APPT_STATES.IN_PROGRESS] },
      $or: [
        { slot_start: { $lt: paddedEnd }, slot_end: { $gt: slotStart } }, // The slot + buffer overlaps with an existing appointment
      ]
    });
    if (overlapping) {
      throw new ConflictException('slot_already_booked_or_conflicts_with_buffer');
    }

    // Optional slot hold (POST /slot-locks/reserve): validated before any
    // write so a mismatched/expired lock fails fast without side effects.
    const lockId: string | undefined = (body as any)?.slot_lock_id;
    if (lockId) {
      if (!this.locks) throw new BadRequestException('slot_lock_not_supported');
      await this.locks.validateForBooking(user, lockId, {
        provider_id: doctor.id,
        slot_start: slotStart,
        booking_kind: 'consultation',
      });
    }

    // Home visits don't require an inline location — patient can refine later from /tracking
    if (body.service_type === 'home' && body.visit_location && !body.visit_location?.lat) {
      // Only enforce if a partial location object was passed
      throw new BadRequestException('visit_location.lat required when visit_location is provided');
    }

    // Price snapshot
    const priceMap: Record<ServiceType, number | undefined> = {
      clinic: (doctor as any).price_clinic,
      video: (doctor as any).price_online,
      home: (doctor as any).price_home,
    };
    const price = priceMap[body.service_type];
    if (price === undefined || price === null) {
      throw new BadRequestException(`no price configured for service_type=${body.service_type}`);
    }

    // Calculate fees & total_price
    const service_fee = PLATFORM_FEES.service_fee;
    const home_visit_fee = body.service_type === 'home' ? PLATFORM_FEES.home_visit_fee : 0;
    const transportation_fee = body.service_type === 'home' ? PLATFORM_FEES.transportation_fee : 0;
    const total_price = price + service_fee + home_visit_fee + transportation_fee;

    // Insert — unique index will throw on double-booking
    // Insurance bookings require a saved policy first (BR-2.2): fail before
    // creating the appointment so no orphan booking remains.
    if (pm === 'insurance') {
      const prof: any = await this.connection.collection('patient_profiles').findOne({ user_id: patientId });
      const ins = prof?.insurance || null;
      if (!(ins && (ins.company_id || ins.provider || ins.policy_number))) {
        throw new BadRequestException('NO_INSURANCE_POLICY');
      }
    }

    // Follow-up appointment: validate that the original appointment exists,
    // belongs to the same patient and doctor, and is in a completed state.
    let followUpOf: string | undefined;
    if (body.follow_up_of) {
      const original = await this.apptModel.findOne({ id: body.follow_up_of });
      if (!original) throw new NotFoundException('original_appointment_not_found');
      if (original.patient_id !== patientId) throw new ForbiddenException('follow_up_patient_mismatch');
      if (original.doctor_id !== doctor.id) throw new ForbiddenException('follow_up_doctor_mismatch');
      if (original.status !== APPT_STATES.COMPLETED) throw new BadRequestException('original_appointment_not_completed');
      followUpOf = original.id;
    }

    try {
      const appt = await this.apptModel.create({
        patient_id: patientId,
        booked_by_user_id: bookedBy,
        doctor_id: doctor.id,
        doctor_user_id: doctor.user_id,
        service_type: body.service_type,
        slot_start: slotStart,
        slot_end: slotEnd,
        duration_minutes: duration,
        status: APPT_STATES.PENDING,
        price,
        service_fee,
        home_visit_fee,
        transportation_fee,
        total_price,
        patient_notes: body.patient_notes,
        symptoms: body.symptoms || [],
        visit_location: body.visit_location,
        // P17-17.5: campaign attribution for the campaign report.
        attribution: pickAttribution(body) ?? undefined,
        payment_method: pm,
        insurance_provider: body.insurance_provider,
        insurance_member_id: body.insurance_member_id,
        follow_up_of: followUpOf,
        state_history: [
          { state: APPT_STATES.PENDING, at: new Date(), by_user_id: user.id, by_role: user.role || UserRole.PATIENT, note: 'created' },
        ],
      });

      // Bind the validated hold to this booking. Best-effort: the booking is
      // already persisted, so a confirm failure must not fail the booking —
      // the 10-minute TTL reaps the dangling hold automatically.
      if (lockId && this.locks) {
        await this.locks.confirm(user, lockId, appt.id).catch(() => null);
      }

      await this.engine.announceCreated({ kind: 'consultation', entity_id: appt.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: patientId, meta: { doctor_id: doctor.id, service_type: body.service_type, slot_start: slotStart, price, total_price } });

      // Card payments stay PENDING until payment.completed webhook confirms.
      // Cash & insurance auto-confirm immediately (instant booking UX).
      if (pm !== 'card') {
        await this.transition(appt.id, APPT_STATES.CONFIRMED, { id: 'system', role: 'system' }, `auto-confirmed (${pm})`);
        this.events.emit('appointment.confirmed', { id: appt.id });
      }

      const refreshed = await this.apptModel.findOne({ id: appt.id }, { _id: 0, __v: 0 });
      this.events.emit('appointment.created', { id: appt.id, patient_id: patientId, doctor_id: doctor.id, total_price });
      let insurance_request_id: string | null = null;
      if (pm === 'insurance') {
        // Raises NO_INSURANCE_POLICY when the patient has no saved policy,
        // so the app redirects to add-policy before booking (BR-2.2).
        const req = await this.insurance.createRequest(
          { id: user.id, full_name: (user as any).full_name },
          { booking_kind: 'consultation', booking_id: appt.id },
        );
        insurance_request_id = (req as any)?.id || null;
      }
      const out = refreshed?.toObject();
      if (out && insurance_request_id) out.insurance_request_id = insurance_request_id;
      return out;
    } catch (e: any) {
      // Release the validated hold so the user can retry immediately instead
      // of waiting out the 10-minute TTL. Never masks the original error.
      if (lockId && this.locks) await this.locks.releaseQuietly(user, lockId);
      if (e?.code === 11000) {
        throw new ConflictException('slot_already_booked');
      }
      throw e;
    }
  }

  private async isDoctorOwner(appt: any, user: any): Promise<boolean> {
    const profile: any = await this.providerModel.findOne({ id: appt.doctor_id, type: ProviderType.DOCTOR });
    if (!profile) return false;
    const actorIds = [user?.id, user?.account_id, user?.provider_id, user?.provider_profile_id].filter(Boolean);
    const doctorIds = [profile.id, profile.user_id, profile.account_id].filter(Boolean);
    return actorIds.some((id) => doctorIds.includes(id));
  }

  /** Hospital acting on an appointment of a doctor linked to it (provider_accounts.facility_id, set on invitation accept). */
  private async isFacilityOwner(appt: any, user: any): Promise<boolean> {
    if (!hasEffectiveRole(user, UserRole.HOSPITAL) || !user?.id) return false;
    const profile: any = await this.providerModel.findOne({ id: appt.doctor_id, type: ProviderType.DOCTOR });
    const accountIds = [profile?.account_id, profile?.user_id, appt.doctor_user_id].filter(Boolean).map(String);
    if (!accountIds.length) return false;
    const linked = await this.connection.collection('provider_accounts')
      .findOne({ $or: [{ id: { $in: accountIds } }, { user_id: { $in: accountIds } }], facility_id: String(user.id) } as any, { projection: { _id: 1 } });
    return !!linked;
  }

  /**
   * `booker`: the family member who booked and paid for someone else (684) may also read the booking, preview its
   * refund and cancel it; never join the call, read the medical summary or move its state.
   */
  private async assertAppointmentAccess(appt: any, user: any, opts: { booker?: boolean } = {}): Promise<void> {
    if (user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN) return;
    if (appt.patient_id === user?.id) return;
    if (opts.booker && appt.booked_by_user_id && appt.booked_by_user_id === user?.id) return;
    if (await this.isDoctorOwner(appt, user)) return;
    if (await this.isFacilityOwner(appt, user)) return;
    throw new ForbiddenException();
  }

  /** ===== Read ===== */
  /** Admin oversight list (any status, newest first). */
  async adminList(limit = 50, status?: ApptState) {
    const q: any = {};
    if (status) q.status = status;
    return this.apptModel.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(limit).lean().catch(() => []);
  }
  async listMine(user: any, status?: ApptState) {
    const q: any = {};
    // Admins can view all appointments
    if (user.role === UserRole.ADMIN) {
        // no additional filter
    } else if (user.role === UserRole.DOCTOR || user.provider_type === ProviderType.DOCTOR || user.providerType === ProviderType.DOCTOR) {
        const profile = await this.providerModel.findOne({
          type: ProviderType.DOCTOR,
          $or: [{ user_id: user.id }, { account_id: user.id }, { id: user.id }],
        });
        if (!profile) return [];
        q.doctor_id = profile.id;
    } else {
        q.patient_id = user.id;
    }
    if (status) q.status = status;
    const rows: any[] = await this.apptModel.find(q, { _id: 0, __v: 0 }).sort({ slot_start: -1 }).limit(200).lean();
    // needs-review 2-web#7: the list carries the doctor's name and the specialty in every locale, like the detail
    // (one lookup for all the doctors of the page), so the appointments list can say who and what.
    const ids = [...new Set(rows.map((r) => r.doctor_id).filter(Boolean))];
    const doctors: any[] = ids.length
      ? await this.providerModel.find({ id: { $in: ids }, type: ProviderType.DOCTOR }, { id: 1, name_ar: 1, name: 1, specialty_ar: 1, specialty: 1, _id: 0 }).lean()
      : [];
    const byId = new Map(doctors.map((d) => [d.id, d]));
    return rows.map((r) => {
      const doctor: any = byId.get(r.doctor_id);
      if (!doctor) return r;
      const slug = doctor.specialty || doctor.specialty_ar;
      const entry = SPECIALTY_MASTER.find((x) => x.slug === slug);
      const specialtyAr = (entry?.name_ar || doctor.specialty_ar || doctor.specialty) ?? null;
      return { ...r, doctor_name: doctor.name_ar || doctor.name || null, specialty_id: slug || null, specialty_ar: specialtyAr, specialty_name_ar: entry?.name_ar ?? specialtyAr, specialty_name_en: entry?.name_en ?? null };
    });
  }

  async one(user: any, id: string) {
    const appt = await this.apptModel.findOne({ id }, { _id: 0, __v: 0 });
    if (!appt) throw new NotFoundException();
    // Authorization: patient owner OR the doctor's provider identity OR admin.
    await this.assertAppointmentAccess(appt, user, { booker: true });

    const obj: any = appt.toObject();
    // 2-app#3: the doctor's position is shared only while the doctor is on the way
    if (String(obj.status) !== APPT_STATES.EN_ROUTE) delete obj.doctor_position;
    
    // B-1: follow-up linkage, both directions. `follow_up_of` is stored at
    // booking time (same patient + doctor, original completed — validated in
    // create); the original also lists its follow-ups so clients can render
    // the "follow-up link to the original appointment" (#802 app, #807 web).
    // Follow-ups share this appointment's patient and doctor by construction,
    // so no additional access check is needed beyond the one above.
    // Enrichment only: a lookup failure must never break the core read.
    let followUps: any[] = [];
    try {
      const children: any[] = await this.apptModel
        .find({ follow_up_of: obj.id }, { _id: 0, __v: 0 })
        .sort({ slot_start: 1 })
        .lean();
      followUps = (children || []).map((c: any) => ({
        id: c.id,
        slot_start: c.slot_start,
        status: c.status,
        service_type: c.service_type,
      }));
    } catch {
      followUps = [];
    }
    obj.follow_ups = followUps;
    
    // Q-16: video appointments carry what the call screen needs (room route).
    if (obj.service_type === 'video') {
      const joinable = [APPT_STATES.CONFIRMED, APPT_STATES.CHECKED_IN, APPT_STATES.IN_PROGRESS].includes(obj.status);
      obj.call = { room: `appt_${obj.id}`, join_path: `/care/appointments/${obj.id}/call`, joinable };
    }
    // Q-17: clients read `consultation_type`; the stored field is `service_type`.
    if (!obj.consultation_type && obj.service_type) obj.consultation_type = obj.service_type;
    // Fetch doctor info to attach name and specialty (Q-19: id + every locale
    // from SPECIALTY_MASTER, the single source — specialty_ar kept for compat).
    const doctor: any = await this.providerModel.findOne({ id: obj.doctor_id, type: ProviderType.DOCTOR }, { name_ar: 1, specialty_ar: 1, specialty: 1, name: 1, _id: 0 });
    if (doctor) {
      obj.doctor_name = doctor.name_ar || doctor.name;
      const slug = doctor.specialty || doctor.specialty_ar;
      const entry = SPECIALTY_MASTER.find((s) => s.slug === slug);
      obj.specialty_id = slug || null;
      obj.specialty_ar = (entry?.name_ar || doctor.specialty_ar || doctor.specialty) ?? null;
      obj.specialty_name_ar = entry?.name_ar ?? obj.specialty_ar;
      obj.specialty_name_en = entry?.name_en ?? null;
    }

    
    // No queue or wait-time source exists: nothing is invented here (the waiting room shows the wait only when sent).

    // D-26: every booking the patient reads says what a cancel right now would refund.
    if (user?.role === UserRole.PATIENT || user?.id === appt.patient_id) {
      const { refundPercentage } = await this.calculateRefund(appt, user);
      obj.cancellation = {
        refund_now: { percent: refundPercentage, amount: Math.round((Number(appt.total_price || 0) * refundPercentage) / 100) },
      };
    }

    return obj;
  }

  /** ===== Transition primitives ===== */
  async transition(id: string, to: ApptState, actor: any, note?: string) {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    const isInternalSystemTransition = actor?.id === 'system' && actor?.role === 'system';
    if (!isInternalSystemTransition) await this.assertAppointmentAccess(appt, actor);
    const allowed = APPT_TRANSITIONS[appt.status] || [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Invalid transition ${appt.status} → ${to}`);
    }
    return await this.engine.apply({
      kind: 'consultation', entity_id: appt.id, from_domain: appt.status, to_domain: to,
      actor_account_id: actor.id, actor_role: actor.role, patient_account_id: appt.patient_id, reason: note,
      mutate: async () => {
        appt.status = to;
        appt.state_history.push({ state: to, at: new Date(), by_user_id: actor.id, by_role: actor.role, note });
        if (to === APPT_STATES.CONFIRMED) appt.confirmed_at = new Date();
        if (to === APPT_STATES.COMPLETED) appt.completed_at = new Date();
        await appt.save();
        this.events.emit(`appointment.${to.toLowerCase()}`, { id, actor: actor.id });
        return appt.toObject();
      },
    });
  }

  // High-level commands

  async cancel(id: string, user: any, reason?: string, isNoShow: boolean = false) {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    await this.assertAppointmentAccess(appt, user, { booker: true });

    const { refundPercentage, refundDestination, penaltyAmount } = await this.calculateRefund(appt, user, reason, isNoShow);

    appt.cancellation_reason = reason || '';
    appt.refund_percentage = refundPercentage;
    appt.refund_destination = refundDestination;
    appt.doctor_penalty = penaltyAmount;
    await appt.save();

    // Emit event for Billing/Refund processors to act upon
    this.events.emit('appointment.refund.calculated', {
      appointment_id: id,
      patient_id: appt.patient_id,
      doctor_id: appt.doctor_id,
      total_price: appt.total_price,
      refund_percentage: refundPercentage,
      refund_destination: refundDestination,
      penalty_amount: penaltyAmount
    });

    return this.transition(id, APPT_STATES.CANCELLED, user, reason);
  }

  /**
   * Preview the refund that would be issued if the caller cancelled now (same rules as cancel).
   * Does NOT modify the appointment.
   */
  async previewRefund(id: string, user: any): Promise<{ refund_percentage: number; refund_destination: string; penalty_amount: number; estimated_amount: number }> {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    await this.assertAppointmentAccess(appt, user, { booker: true });
    const { refundPercentage, refundDestination, penaltyAmount } = await this.calculateRefund(appt, user);
    const estimatedAmount = Math.round((Number(appt.total_price || 0) * refundPercentage) / 100);
    return { refund_percentage: refundPercentage, refund_destination: refundDestination, penalty_amount: penaltyAmount, estimated_amount: estimatedAmount };
  }

  private async getRefundPolicy(): Promise<any> {
    if (!this.connection || typeof (this.connection as any).collection !== 'function') {
      return DEFAULT_REFUND_POLICY;
    }
    const doc: any = await this.connection.collection('system_configs').findOne({ key: 'refund_policy' }, { projection: { _id: 0, value: 1 } });
    return doc?.value || DEFAULT_REFUND_POLICY;
  }

  // Cancellation & Refund Rules (shared by cancel and previewRefund)
  private async calculateRefund(appt: any, user: any, reason?: string, isNoShow = false): Promise<{ refundPercentage: number; refundDestination: string; penaltyAmount: number }> {
    let refundPercentage = 0;
    let penaltyAmount = 0;
    let refundDestination = 'source';

    const policy = await this.getRefundPolicy();
    const consultationPolicy = policy.consultation || DEFAULT_REFUND_POLICY.consultation;

    const slotStart = new Date(appt.slot_start);
    const hoursUntilAppointment = (slotStart.getTime() - Date.now()) / (1000 * 60 * 60);

    if (isNoShow || reason === 'no_show') {
      refundPercentage = consultationPolicy.patient_no_show_percent ?? 0;
    } else if (user.role === UserRole.PATIENT || user.id === appt.patient_id) {
      if (hoursUntilAppointment >= (consultationPolicy.full_refund_min_hours ?? 2)) {
        refundPercentage = 100;
        refundDestination = 'source';
      } else {
        refundPercentage = consultationPolicy.late_refund_percent ?? 50;
        // B-11 legacy read model: late patient cancels read 'wallet'; the money
        // itself always goes back through the gateway (never a wallet credit).
        refundDestination = 'wallet';
      }
    } else if (hasEffectiveRole(user, UserRole.DOCTOR) || user.id === appt.doctor_user_id) {
      refundPercentage = 100;
      refundDestination = 'source';
      penaltyAmount = 50; // 50 SAR penalty applied to Doctor's wallet
    } else if (hasEffectiveRole(user, UserRole.HOSPITAL) || hasEffectiveRole(user, UserRole.ADMIN)) {
      // provider-side cancellation by the facility (or admin): the patient is refunded in full
      refundPercentage = 100;
      refundDestination = 'source';
    }
    return { refundPercentage, refundDestination, penaltyAmount };
  }

  async confirm(id: string, user: any) {
    // doctor or admin
    return this.transition(id, APPT_STATES.CONFIRMED, user, 'doctor-confirmed');
  }

  async checkIn(id: string, user: any) {
    return this.transition(id, APPT_STATES.CHECKED_IN, user);
  }

  /** Q-15: provider start-trip — home visits only. Emits appointment.en_route. */
  async enRoute(id: string, user: any) {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    if (appt.service_type !== 'home') throw new BadRequestException('en_route is for home visits only');
    return this.transition(id, APPT_STATES.EN_ROUTE, user, 'doctor-en-route');
  }

  /** Q-15: provider arrived — home visits only. Emits appointment.arrived. */
  /**
   * 2-app#3: the doctor's live position while on the way to a home visit (the provider app sends it every half minute or
   * so). Only the appointment's own doctor, only for a home visit in EN_ROUTE; the patient reads it on the appointment.
   */
  async updatePosition(id: string, user: any, lat: number, lng: number) {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    if (!(await this.isDoctorOwner(appt, user)) && user?.role !== UserRole.ADMIN) throw new ForbiddenException();
    if (appt.service_type !== 'home' || appt.status !== APPT_STATES.EN_ROUTE) throw new BadRequestException('position_only_while_en_route');
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new BadRequestException('invalid_position');
    const at = new Date();
    await this.apptModel.updateOne({ id }, { $set: { doctor_position: { lat, lng, at } } });
    return { ok: true, at };
  }

  async arrive(id: string, user: any) {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    if (appt.service_type !== 'home') throw new BadRequestException('arrived is for home visits only');
    return this.transition(id, APPT_STATES.ARRIVED, user, 'doctor-arrived');
  }

  async start(id: string, user: any) {
    return this.transition(id, APPT_STATES.IN_PROGRESS, user);
  }

  async complete(id: string, user: any) {
    return this.transition(id, APPT_STATES.COMPLETED, user);
  }

  /** Doctor finishes the consultation: persists the SOAP summary for real, then completes. */
  async finish(id: string, body: any, user: any) {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    await this.assertAppointmentAccess(appt, user);
    if (body && (body.diagnosis || body.notes || body.recommendations || (Array.isArray(body.prescription) && body.prescription.length))) {
      // 660: keep the catalogue id per line (sent by the doctor app, else resolved by name).
      const lines: any[] = [];
      for (const line of (Array.isArray(body.prescription) ? body.prescription : [])) {
        const name = line?.name;
        lines.push({ ...line, medicine_id: line?.medicine_id || await this.resolvePrescriptionMedicineId(name) });
      }
      appt.summary = {
        diagnosis: body.diagnosis, notes: body.notes, recommendations: body.recommendations,
        prescription: lines,
        follow_up_recommended: !!body.follow_up_recommended,
        follow_up_window_days: body.follow_up_window_days != null ? Number(body.follow_up_window_days) : undefined,
        written_at: new Date(),
      } as any;
      await appt.save();
    }
    const done = await this.transition(id, APPT_STATES.COMPLETED, user);
    return { success: true, appointment: done };
  }

  /** Q-16: the patient's call records — their video appointments, owner-checked. */
  async callsFor(user: any) {
    const q: any = { service_type: 'video' };
    if (user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN) {
      // no additional filter
    } else {
      q.patient_id = user?.id;
    }
    const rows: any[] = await this.apptModel.find(q, { _id: 0, __v: 0 }).sort({ slot_start: -1 }).limit(100);
    return rows.map((r: any) => {
      const o = r?.toObject ? r.toObject() : r;
      return {
        appointment_id: o.id, doctor_id: o.doctor_id, slot_start: o.slot_start,
        status: o.status, room: `appt_${o.id}`,
      };
    });
  }

  /** Q-16: join info for a video appointment's room — owner-checked, no invented tokens. */
  async callJoin(id: string, user: any) {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    await this.assertAppointmentAccess(appt, user);
    if (appt.service_type !== 'video') throw new BadRequestException('not_a_video_appointment');
    const joinable = [APPT_STATES.CONFIRMED, APPT_STATES.CHECKED_IN, APPT_STATES.IN_PROGRESS].includes(appt.status);
    return { appointment_id: appt.id, room: `appt_${appt.id}`, joinable, status: appt.status };
  }

  /**
   * P13-R14: every consultation output links straight to booking/ordering.
   * Targets use only verified routes (patient-app webLinkMap + patient-web
   * pages): product `p/:slug`, `diagnostics`, `consultations/doctor/:id`,
   * `consultations/book/:doctorId`. Issuing stays doctor-or-admin only (the
   * controller role guard + ownership check are the per-role matrix: nurses,
   * technicians and patients cannot issue outputs).
   */
  private async orderLinkForMedicine(medicineId: string | null): Promise<any> {
    let slug: string | null = null;
    if (medicineId) {
      try {
        const col = (this.connection as any)?.collection?.('medicines') ?? (this.connection as any)?.db?.collection?.('medicines');
        const hit: any = col ? await col.findOne({ id: medicineId }, { projection: { _id: 0, slug: 1 } }) : null;
        if (hit?.slug) slug = String(hit.slug);
      } catch { slug = null; }
    }
    if (slug) {
      const seg = encodeURIComponent(slug);
      return {
        action: { type: 'order_medicine', medicine_id: medicineId },
        deep_link: `nabdplus://p/${seg}`,
        web_path: `/ar/p/${seg}`,
      };
    }
    return {
      action: { type: 'order_medicine', medicine_id: medicineId },
      deep_link: 'nabdplus://pharmacy',
      web_path: '/ar/pharmacy',
    };
  }

  /** Patient (or the doctor/admin) reads the consultation summary. 404 → screen shows honest not-ready. */
  async getSummary(id: string, user: any) {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    if (user.role !== UserRole.ADMIN && appt.patient_id !== user.id && appt.doctor_user_id !== user.id) throw new ForbiddenException();
    if (!appt.summary || !(appt.summary.diagnosis || appt.summary.notes || (appt.summary.prescription || []).length)) {
      throw new NotFoundException('summary not available yet');
    }
    // 16.9: the consultation summary is a medical record: a row for every read
    await logMedicalRead(this.accessLog, user, [{ kind: 'consultation_summary', id: String(id), action: 'read', subject_id: appt.patient_id }]);
    // a plain object (getters applied: the summary text is ciphertext in the database), not the Mongoose subdocument
    const summary: any = typeof (appt as any).toObject === 'function' ? ((appt as any).toObject().summary ?? appt.summary) : appt.summary;
    // 660: backfill catalogue ids for legacy lines; 661/683: attach outcome referrals.
    const prescription: any[] = [];
    for (const line of summary.prescription || []) {
      const medicineId = line?.medicine_id || await this.resolvePrescriptionMedicineId(line?.name);
      prescription.push({ ...line, medicine_id: medicineId, ...(await this.orderLinkForMedicine(medicineId)) });
    }
    const referrals = await this.outcomeReferrals(appt);
    const out: any = { doctor_id: appt.doctor_id, ...summary, prescription };
    if (referrals) {
      out.referrals = referrals;
      const actions: any = {};
      if ((referrals.lab_tests || []).length > 0) {
        actions.lab = {
          action: { type: 'book_lab', tests: referrals.lab_tests },
          deep_link: 'nabdplus://diagnostics',
          web_path: '/ar/diagnostics',
        };
      }
      if ((referrals.radiology_scans || []).length > 0) {
        actions.radiology = {
          action: { type: 'book_radiology', scans: referrals.radiology_scans },
          deep_link: 'nabdplus://diagnostics?tab=radiology',
          web_path: '/ar/diagnostics',
        };
      }
      if (Object.keys(actions).length > 0) out.referral_actions = actions;
    }
    if (summary.follow_up_recommended && appt.doctor_id) {
      const seg = encodeURIComponent(String(appt.doctor_id));
      out.follow_up_action = {
        action: { type: 'book_followup', doctor_id: appt.doctor_id, window_days: summary.follow_up_window_days ?? null },
        deep_link: `nabdplus://consultations/doctor/${seg}`,
        web_path: `/ar/consultations/book/${seg}`,
      };
    }
    return out;
  }

  async reschedule(id: string, user: any, body: { slot_start: string }) {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    if (user.role !== UserRole.ADMIN && appt.patient_id !== user.id && appt.doctor_user_id !== user.id) {
      throw new ForbiddenException();
    }
    if ([APPT_STATES.CANCELLED, APPT_STATES.COMPLETED, APPT_STATES.RESCHEDULED].includes(appt.status)) {
      throw new BadRequestException('cannot_reschedule');
    }
    // D-26: one free reschedule, only while the current slot is far enough out.
    const policy = await this.getRefundPolicy();
    const freeReschedules = Number(policy?.consultation?.free_reschedules ?? 1);
    const minHours = Number(policy?.consultation?.free_reschedule_min_hours ?? 2);
    const hoursToSlot = (new Date(appt.slot_start).getTime() - Date.now()) / (1000 * 60 * 60);
    if (!(hoursToSlot >= minHours)) {
      throw new BadRequestException('reschedule_too_late_for_free_reschedule');
    }
    let priorReschedules = 0;
    try {
      let cursor: any = typeof appt?.toObject === 'function' ? appt.toObject() : appt;
      const seen = new Set<string>([String(cursor?.id)]);
      for (let i = 0; i < 10; i++) {
        const prevId = cursor?.rescheduled_from_id;
        if (typeof prevId !== 'string' || !prevId || seen.has(prevId)) break;
        seen.add(prevId);
        priorReschedules++;
        const q: any = this.apptModel.findOne({ id: prevId }, { _id: 0, id: 1, rescheduled_from_id: 1 });
        const prev: any = q && typeof q.lean === 'function' ? await q.lean() : await q;
        if (!prev) break;
        cursor = typeof prev?.toObject === 'function' ? prev.toObject() : prev;
      }
    } catch {
      priorReschedules = 0;
    }
    if (priorReschedules >= freeReschedules) {
      throw new BadRequestException('no_free_reschedules_left');
    }
    const newStart = new Date(body.slot_start);
    if (isNaN(newStart.getTime()) || newStart.getTime() < Date.now() + 5 * 60_000) {
      throw new BadRequestException('slot_start must be in the future');
    }
    if (newStart.getMinutes() % 15 !== 0 || newStart.getSeconds() !== 0 || newStart.getMilliseconds() !== 0) {
      throw new BadRequestException('slot_start must be exactly on a 15-minute boundary');
    }

    const newEnd = new Date(newStart.getTime() + appt.duration_minutes * 60_000);
    const paddedEnd = new Date(newEnd.getTime() + 5 * 60_000);
    const overlapping = await this.apptModel.findOne({
      doctor_id: appt.doctor_id,
      status: { $in: [APPT_STATES.PENDING, APPT_STATES.CONFIRMED, APPT_STATES.CHECKED_IN, APPT_STATES.IN_PROGRESS] },
      $or: [{ slot_start: { $lt: paddedEnd }, slot_end: { $gt: newStart } }],
    });
    if (overlapping) throw new ConflictException('slot_already_booked_or_conflicts_with_buffer');

    // Create first so a rejected/conflicting replacement preserves the original
    // appointment. If persisting the original transition subsequently fails,
    // remove the replacement as a compensating action before surfacing the error.
    const fresh = await this.apptModel.create({
      patient_id: appt.patient_id,
      doctor_id: appt.doctor_id,
      doctor_user_id: appt.doctor_user_id,
      service_type: appt.service_type,
      slot_start: newStart,
      slot_end: newEnd,
      duration_minutes: appt.duration_minutes,
      status: APPT_STATES.CONFIRMED,
      price: appt.price,
      service_fee: (appt as any).service_fee || 0,
      home_visit_fee: (appt as any).home_visit_fee || 0,
      transportation_fee: (appt as any).transportation_fee || 0,
      total_price: (appt as any).total_price || appt.price,
      rescheduled_from_id: appt.id,
      state_history: [{ state: APPT_STATES.CONFIRMED, at: new Date(), by_user_id: user.id, by_role: user.role, note: 'rescheduled-from-' + appt.id }],
    });
    try {
      appt.status = APPT_STATES.RESCHEDULED;
      appt.state_history.push({ state: APPT_STATES.RESCHEDULED, at: new Date(), by_user_id: user.id, by_role: user.role, note: 'rescheduled' });
      await appt.save();
    } catch (error) {
      await this.apptModel.deleteOne({ id: fresh.id }).catch(() => null);
      throw error;
    }
    return fresh.toObject();
  }

  // ===== Waitlist =====
  async joinWaitlist(user: any, body: { doctorId: string; date: string }) {
    if (!body?.doctorId || !body?.date) {
      throw new BadRequestException('doctorId and date are required');
    }
    // Emit an event to be handled by a notification worker or admin dashboard
    this.events.emit('appointment.waitlist.joined', {
      patient_id: user.id,
      doctor_id: body.doctorId,
      date: body.date,
    });
    this.logger.log(`Patient ${user.id} joined waitlist for doctor ${body.doctorId} on ${body.date}`);
    return { success: true, message: 'Joined waitlist successfully' };
  }

  // ===== Payment webhook handler =====

  /**
   * When Moyasar (or any PSP) confirms payment, transition the appointment
   * from PENDING → CONFIRMED so the patient sees the booking go live.
   */
  @OnEvent('payment.completed')
  async onPaymentCompleted(payload: { booking_id?: string; booking_kind?: string; amount?: number; transaction_id?: string }) {
    if (payload.booking_kind !== 'consultation' || !payload.booking_id) return;
    const appt = await this.apptModel.findOne({ id: payload.booking_id });
    if (!appt) {
      this.logger.warn(`payment.completed: appointment ${payload.booking_id} not found`);
      return;
    }
    // Only transition if still PENDING (idempotent — ignore if already confirmed)
    if (appt.status !== APPT_STATES.PENDING) {
      this.logger.log(`payment.completed: appointment ${appt.id} already ${appt.status}, skipping`);
      return;
    }
    // Mark payment as paid
    appt.payment_status = 'paid';
    await appt.save();
    await this.transition(appt.id, APPT_STATES.CONFIRMED, { id: 'system', role: 'system' }, 'payment-confirmed');
    this.events.emit('appointment.confirmed', { id: appt.id });
    this.logger.log(`payment.completed: appointment ${appt.id} confirmed after payment ${payload.transaction_id}`);
  }
}
