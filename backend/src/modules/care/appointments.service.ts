import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException, Logger, Inject, Optional, ServiceUnavailableException } from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Appointment, AppointmentDocument, APPT_STATES, APPT_TRANSITIONS, ApptState, ServiceType } from '../../schemas/appointment.schema';
import { WaitlistEntry, WaitlistEntryDocument } from './schemas/waitlist-entry.schema';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { UserRole, ProviderType, ProviderStatus } from '../../common/enums';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { InsuranceFlowService } from '../insurance-engine/insurance-engine.module';
import { SlotLocksService } from '../slot-locks/slot-locks.module';
import { AppointmentRepository } from "./repositories/appointment.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { hasEffectiveRole } from '../../common/auth.guard';
import { emitAudit } from '../audit-trail/audit-emitter';

/** Platform fee schedule (SAR). Move to DB/config when admin dashboard supports it. */
const PLATFORM_FEES = {
  service_fee: 15,           // flat service fee for all bookings
  home_visit_fee: 100,       // additional fee for home visits
  transportation_fee: 50,    // transportation surcharge for home visits
};

/**
 * Q37 — slot-listing buffer parity (listed-available implies bookable).
 * create()/reschedule() pad the NEW appointment by 5 minutes and refuse when an
 * existing blocking appointment satisfies:
 *   existing.slot_start < paddedEnd && existing.slot_end > slotStart
 * The slot-listing path must apply this IDENTICAL rule when it builds
 * `available: true/false`; otherwise a slot (e.g. 16:30 with a 17:00 booking
 * right after it) is listed available but POST /care/appointments 409s with
 * slot_already_booked_or_conflicts_with_buffer.
 * These pure helpers are the single definition of that rule for the listing
 * path — create()/reschedule()/assertNoForeignSlotHold() (Q36) below are
 * intentionally untouched.
 */
export const APPOINTMENT_SLOT_BUFFER_MINUTES = 5;

/** P22.6 — no-show / late / waitlist policy (admin-settable, audited). */
export const NOSHOW_POLICY_KEY = 'noshow_policy';
export const NOSHOW_POLICY_DEFAULTS = {
  enabled: true,
  fee_sar: 50,
  late_threshold_minutes: 15,
  waitlist_offer_ttl_minutes: 15,
} as const;

export interface NoShowPolicy {
  enabled: boolean;
  fee_sar: number;
  late_threshold_minutes: number;
  waitlist_offer_ttl_minutes: number;
}

export function normalizePolicy(raw: unknown): NoShowPolicy {
  const r = (raw ?? {}) as Partial<Record<keyof NoShowPolicy, unknown>>;
  const num = (v: unknown, fallback: number, min: number, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  return {
    enabled: r.enabled === undefined ? NOSHOW_POLICY_DEFAULTS.enabled : r.enabled === true,
    fee_sar: num(r.fee_sar, NOSHOW_POLICY_DEFAULTS.fee_sar, 0, 10000),
    late_threshold_minutes: Math.floor(num(r.late_threshold_minutes, NOSHOW_POLICY_DEFAULTS.late_threshold_minutes, 5, 240)),
    waitlist_offer_ttl_minutes: Math.floor(num(r.waitlist_offer_ttl_minutes, NOSHOW_POLICY_DEFAULTS.waitlist_offer_ttl_minutes, 5, 1440)),
  };
}

export function toSlotDate(d: Date | string): string {
  const dt = new Date(d);
  return dt.toISOString().slice(0, 10);
}

/** Blocking statuses mirrored from create()'s overlap query (Q37 parity). */
export const APPOINTMENT_LISTING_BLOCKING_STATUSES = [
  APPT_STATES.PENDING,
  APPT_STATES.CONFIRMED,
  APPT_STATES.CHECKED_IN,
  APPT_STATES.IN_PROGRESS,
] as const;

/** paddedEnd for a candidate slot — identical to create()'s `paddedEnd`. */
export function slotPaddedEnd(slotStart: Date, durationMinutes = 30): Date {
  return new Date(slotStart.getTime() + durationMinutes * 60_000 + APPOINTMENT_SLOT_BUFFER_MINUTES * 60_000);
}

/**
 * Identical to create()'s overlap predicate: the candidate (plus its 5-min
 * buffer) conflicts with an existing booking iff the booking starts before the
 * candidate's padded end and ends after the candidate's start. Strict
 * inequalities match the booking query exactly (a booking starting exactly at
 * paddedEnd does NOT conflict).
 */
export function slotCandidateConflictsWithBooking(
  candidateStart: Date,
  candidateEnd: Date,
  bookingStart: Date,
  bookingEnd: Date,
): boolean {
  const paddedEnd = new Date(candidateEnd.getTime() + APPOINTMENT_SLOT_BUFFER_MINUTES * 60_000);
  return bookingStart.getTime() < paddedEnd.getTime() && bookingEnd.getTime() > candidateStart.getTime();
}

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
    @Optional() @InjectModel(WaitlistEntry.name) private waitlist?: Model<WaitlistEntryDocument>,
  ) {}

  /**
   * P22.6 — read the admin-settable no-show policy. Fail-open to compiled
   * defaults when the store is unreachable; fail-closed validation clamps
   * every field so a bad admin write can never produce a negative fee.
   */
  async getNoShowPolicy(): Promise<NoShowPolicy> {
    try {
      const doc = await this.connection.db.collection('system_configs').findOne({ key: { $eq: NOSHOW_POLICY_KEY } });
      const raw = (doc as unknown as { value?: unknown } | null)?.value;
      if (!raw || typeof raw !== 'object') return { ...NOSHOW_POLICY_DEFAULTS };
      return normalizePolicy(raw);
    } catch {
      return { ...NOSHOW_POLICY_DEFAULTS };
    }
  }

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

  /**
   * Q36 — refuse booking a slot another patient actively holds.
   * Matches holds on the same provider whose [slot_start, slot_end) range
   * overlaps the requested appointment, with status 'held' and
   * expires_at in the future (expired holds never block). Holds owned by
   * the booker (or the on-behalf patient) are excluded so the holder can
   * still book inside their own hold.
   */
  private async assertNoForeignSlotHold(
    providerId: string,
    slotStart: Date,
    slotEnd: Date,
    user: any,
    patientId: string,
  ): Promise<void> {
    const now = new Date();
    const selfIds = [user?.id, patientId].filter(Boolean);
    let blocking: any = null;
    try {
      const model = (this.connection as any)?.model?.('SlotLock');
      if (!model?.findOne) return;
      const q = model.findOne({
        provider_id: providerId,
        status: 'held',
        expires_at: { $gt: now },
        slot_start: { $lt: slotEnd },
        slot_end: { $gt: slotStart },
        patient_id: { $nin: selfIds },
      });
      blocking = typeof q?.lean === 'function' ? await q.lean() : await q;
    } catch (e) {
      // Fail closed: a booking that cannot see the holds could take a held slot.
      this.logger.warn(`slot-hold check unavailable, refusing the booking: ${(e as any)?.message}`);
      throw new ServiceUnavailableException('slot_hold_check_unavailable');
    }
    if (blocking) throw new ConflictException('slot_held');
  }

  /**
   * Q37 — slot-listing path: `available` for one candidate slot under the
   * IDENTICAL 5-min buffer rule create() enforces, so listed-available implies
   * bookable. Pure read over caller-supplied blocking bookings (no DB); the
   * caller must pass bookings in create()'s blocking statuses.
   */
  isSlotListAvailable(
    candidateStart: Date | string,
    bookings: { slot_start: Date | string; slot_end: Date | string }[],
    durationMinutes = 30,
  ): boolean {
    const start = new Date(candidateStart);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    return !bookings.some((b) =>
      slotCandidateConflictsWithBooking(start, end, new Date(b.slot_start), new Date(b.slot_end)),
    );
  }

  /**
   * Q37 — batch version of the listing path: builds the `available` flag for
   * each candidate slot with the same buffer rule as booking.
   */
  markSlotsAvailability(
    candidates: { start: Date | string; durationMinutes?: number }[],
    bookings: { slot_start: Date | string; slot_end: Date | string }[],
    defaultDurationMinutes = 30,
  ): { start: string; available: boolean }[] {
    return candidates.map((c) => {
      const start = new Date(c.start);
      const dur = c.durationMinutes ?? defaultDurationMinutes;
      return { start: start.toISOString(), available: this.isSlotListAvailable(start, bookings, dur) };
    });
  }

  /** ===== Create ===== */
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
  }) {
    if (!body?.doctor_id || !body?.service_type || !body?.slot_start) {
      throw new BadRequestException('doctor_id, service_type, slot_start required');
    }
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

    // Q36 — booking integrity vs slot holds: refuse when a DIFFERENT patient
    // actively holds this provider+slot (status 'held', unexpired). The
    // holder's own booking stays allowed (their lock is excluded below, or
    // consumed via slot_lock_id). Pure read through the shared connection so
    // no other module's contract changes; expired holds never match because
    // the query requires expires_at > now. Lookup failures refuse the booking (503).
    await this.assertNoForeignSlotHold(doctor.id, slotStart, slotEnd, user, patientId);

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
        payment_method: pm,
        insurance_provider: body.insurance_provider,
        insurance_member_id: body.insurance_member_id,
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

  private async assertAppointmentAccess(appt: any, user: any): Promise<void> {
    if (user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN) return;
    if (appt.patient_id === user?.id) return;
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
    return this.apptModel.find(q, { _id: 0, __v: 0 }).sort({ slot_start: -1 }).limit(200);
  }

  async one(user: any, id: string) {
    const appt = await this.apptModel.findOne({ id }, { _id: 0, __v: 0 });
    if (!appt) throw new NotFoundException();
    // Authorization: patient owner OR the doctor's provider identity OR admin.
    await this.assertAppointmentAccess(appt, user);

    const obj: any = appt.toObject();
    
    // Fetch doctor info to attach name and specialty
    const doctor: any = await this.providerModel.findOne({ id: obj.doctor_id, type: ProviderType.DOCTOR }, { name_ar: 1, specialty_ar: 1, specialty: 1, name: 1, _id: 0 });
    if (doctor) {
      obj.doctor_name = doctor.name_ar || doctor.name;
      obj.specialty_ar = doctor.specialty_ar || doctor.specialty;
    }

    
    obj.queue_position = '٣';
    obj.ahead_count = '٢';
    obj.wait_time = '١٥';

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
        // Phase 23.2 — booking lifecycle in the audit trail (fire-and-forget).
        emitAudit(this.events, {
          action: `booking.${String(to).toLowerCase()}`,
          actor: { id: actor?.id, role: String(actor?.role || 'unknown') },
          entity: { type: 'booking', id: appt.id },
          diff: { before: null, after: { status: to } },
          category: 'booking',
        });
        return appt.toObject();
      },
    });
  }

  // High-level commands

  async cancel(id: string, user: any, reason?: string, isNoShow: boolean = false) {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    await this.assertAppointmentAccess(appt, user);

    // Cancellation & Refund Rules
    let refundPercentage = 0;
    let penaltyAmount = 0;
    let refundDestination = 'source';

    const now = new Date();
    const slotStart = new Date(appt.slot_start);
    const hoursUntilAppointment = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (isNoShow || reason === 'no_show') {
      refundPercentage = 0; // Patient No-Show: 0% refund
    } else if (user.role === UserRole.PATIENT || user.id === appt.patient_id) {
      if (hoursUntilAppointment > 24) {
        refundPercentage = 100;
        refundDestination = 'source';
      } else {
        refundPercentage = 50;
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

    const cancelled = await this.transition(id, APPT_STATES.CANCELLED, user, reason);
    // P22.6 — a freed slot goes to the waitlist first. Best-effort: offering
    // must never fail the cancellation itself.
    try {
      await this.offerNextOnCancellation(appt.doctor_id, toSlotDate(appt.slot_start), new Date(appt.slot_start));
    } catch (e) {
      this.logger.warn(`waitlist offer after cancel failed: ${(e as Error)?.message}`);
    }
    return cancelled;
  }

  async confirm(id: string, user: any) {
    // doctor or admin
    return this.transition(id, APPT_STATES.CONFIRMED, user, 'doctor-confirmed');
  }

  async checkIn(id: string, user: any) {
    return this.transition(id, APPT_STATES.CHECKED_IN, user);
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
      appt.summary = {
        diagnosis: body.diagnosis, notes: body.notes, recommendations: body.recommendations,
        prescription: Array.isArray(body.prescription) ? body.prescription : [],
        follow_up_recommended: !!body.follow_up_recommended,
        follow_up_window_days: body.follow_up_window_days != null ? Number(body.follow_up_window_days) : undefined,
        written_at: new Date(),
      } as any;
      await appt.save();
    }
    const done = await this.transition(id, APPT_STATES.COMPLETED, user);
    return { success: true, appointment: done };
  }

  /** Patient (or the doctor/admin) reads the consultation summary. 404 → screen shows honest not-ready. */
  async getSummary(id: string, user: any) {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    // P22.6 — same ownership as the appointment itself (patient, owning
    // doctor identity, linked facility, admin), not just the raw user id.
    await this.assertAppointmentAccess(appt, user);
    if (!appt.summary || !(appt.summary.diagnosis || appt.summary.notes || (appt.summary.prescription || []).length)) {
      throw new NotFoundException('summary not available yet');
    }
    return { doctor_id: appt.doctor_id, ...appt.summary };
  }

  /**
   * P22.9 — downloadable visit report (completed visits). The PDF mirrors the
   * structured summary served by getSummary(); without a summary the report
   * honestly states "pending" instead of inventing content.
   */
  async visitReportPdf(user: { id: string; role?: string }, id: string): Promise<Buffer> {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    await this.assertAppointmentAccess(appt, user);
    if (appt.status !== APPT_STATES.COMPLETED) throw new BadRequestException('visit_not_completed');
    const summary = appt.summary as {
      diagnosis?: string; notes?: string; recommendations?: string;
      prescription?: Array<{ name?: string; dose?: string; duration?: string }>;
      follow_up_recommended?: boolean; follow_up_window_days?: number; written_at?: Date;
    } | undefined;
    interface PdfDoc {
      on(event: string, cb: (chunk?: Buffer) => void): void;
      end(): void;
      fontSize(n: number): PdfDoc;
      fillColor(c: string): PdfDoc;
      text(t: string, opts?: Record<string, unknown>): PdfDoc;
      moveDown(n?: number): PdfDoc;
    }
    const PDFDoc = (() => {
      // pdfkit is a declared dependency; require keeps the CJS interop stable
      // under ts-jest exactly like the billing invoice path.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('pdfkit') as unknown as new (opts: Record<string, unknown>) => PdfDoc;
      return mod;
    })();
    return new Promise((resolve, reject) => {
      const doc = new PDFDoc({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c?: Buffer) => { if (c) chunks.push(c); });
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(20).fillColor('#0F766E').text('Nabd — Visit Report / تقرير الزيارة', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(11).fillColor('#111111').text(`Appointment: ${appt.id}`);
      doc.fontSize(11).text(`Date: ${new Date(appt.slot_start).toISOString()}`);
      doc.fontSize(11).text(`Service: ${appt.service_type}`);
      doc.moveDown(0.5);
      if (!summary || !(summary.diagnosis || summary.notes || (summary.prescription ?? []).length)) {
        doc.fontSize(12).text('Summary pending — the doctor has not published the visit summary yet.');
      } else {
        if (summary.diagnosis) doc.fontSize(12).text('Diagnosis:', { underline: true }).fontSize(11).text(summary.diagnosis);
        if (summary.notes) doc.fontSize(12).text('Notes:', { underline: true }).fontSize(11).text(summary.notes);
        if (summary.recommendations) doc.fontSize(12).text('Recommendations:', { underline: true }).fontSize(11).text(summary.recommendations);
        const lines = summary.prescription ?? [];
        if (lines.length) {
          doc.fontSize(12).text('Prescribed:', { underline: true });
          lines.slice(0, 20).forEach((p) => doc.fontSize(11).text(`- ${p.name ?? '?'} — ${p.dose ?? '?'} (${p.duration ?? '?'})`));
        }
        if (summary.follow_up_recommended) {
          doc.fontSize(11).text(`Follow-up recommended${summary.follow_up_window_days ? ` within ${summary.follow_up_window_days} days` : ''}.`);
        }
      }
      doc.moveDown(1.5);
      doc.fontSize(9).fillColor('#999999').text('Generated by Nabd Health Platform', { align: 'center' });
      doc.end();
    });
  }

  async reschedule(id: string, user: any, body: { slot_start: string }) {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    // P22.6 — ownership mirrors appointment access (patient, owning doctor,
    // linked facility, admin) plus the family member who booked on behalf.
    const isBooker = typeof appt.booked_by_user_id === 'string' && appt.booked_by_user_id !== '' && appt.booked_by_user_id === user?.id;
    if (!isBooker) await this.assertAppointmentAccess(appt, user);
    // P22.6 — only future, unstarted bookings move. A checked-in/in-progress
    // visit is already underway; cancelled/completed/rescheduled are terminal.
    if (![APPT_STATES.PENDING, APPT_STATES.CONFIRMED].includes(appt.status)) {
      throw new BadRequestException('cannot_reschedule');
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
    // Q36: the new slot must not be another patient's active hold either.
    await this.assertNoForeignSlotHold(appt.doctor_id, newStart, newEnd, user, appt.patient_id);

    // Create first so a rejected/conflicting replacement preserves the original
    // appointment. If persisting the original transition subsequently fails,
    // remove the replacement as a compensating action before surfacing the error.
    // P22.6 — an unpaid (PENDING, card) booking stays PENDING after the move;
    // only CONFIRMED bookings produce CONFIRMED replacements.
    const replacementStatus = appt.status === APPT_STATES.PENDING ? APPT_STATES.PENDING : APPT_STATES.CONFIRMED;
    const fresh = await this.apptModel.create({
      patient_id: appt.patient_id,
      booked_by_user_id: (appt as { booked_by_user_id?: string }).booked_by_user_id,
      doctor_id: appt.doctor_id,
      doctor_user_id: appt.doctor_user_id,
      service_type: appt.service_type,
      slot_start: newStart,
      slot_end: newEnd,
      duration_minutes: appt.duration_minutes,
      status: replacementStatus,
      price: appt.price,
      service_fee: (appt as any).service_fee || 0,
      home_visit_fee: (appt as any).home_visit_fee || 0,
      transportation_fee: (appt as any).transportation_fee || 0,
      total_price: (appt as any).total_price || appt.price,
      rescheduled_from_id: appt.id,
      state_history: [{ state: replacementStatus, at: new Date(), by_user_id: user.id, by_role: user.role, note: 'rescheduled-from-' + appt.id }],
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

  /**
   * P22.6 — governed no-show marking (the configurable policy path).
   * Only a CONFIRMED booking whose slot already passed can be marked; the fee
   * comes from the admin-settable policy (0 when disabled). Idempotent: a
   * booking already NO_SHOW returns its record unchanged.
   */
  async markNoShow(id: string, actor: { id: string; role: string }) {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    if (appt.status === APPT_STATES.NO_SHOW) return appt.toObject();
    const doctorOwned = await this.isDoctorOwner(appt, actor);
    const admin = actor?.role === UserRole.ADMIN || actor?.role === UserRole.SUPER_ADMIN;
    if (!doctorOwned && !admin) throw new ForbiddenException('doctor_or_admin_only');
    if (appt.status !== APPT_STATES.CONFIRMED) {
      throw new BadRequestException(`no_show_requires_confirmed (was ${appt.status})`);
    }
    if (new Date(appt.slot_start).getTime() > Date.now()) {
      throw new BadRequestException('slot_has_not_passed');
    }
    const policy = await this.getNoShowPolicy();
    const fee = policy.enabled ? policy.fee_sar : 0;
    return await this.engine.apply({
      kind: 'consultation', entity_id: appt.id, from_domain: appt.status, to_domain: APPT_STATES.NO_SHOW,
      actor_account_id: actor.id, actor_role: actor.role, patient_account_id: appt.patient_id, reason: 'no_show',
      mutate: async () => {
        appt.status = APPT_STATES.NO_SHOW;
        appt.noshow_fee = fee;
        appt.noshow_at = new Date();
        appt.state_history.push({ state: APPT_STATES.NO_SHOW, at: new Date(), by_user_id: actor.id, by_role: actor.role, note: `no_show fee_sar=${fee}` });
        await appt.save();
        this.events.emit('appointment.no_show', {
          id: appt.id, patient_id: appt.patient_id, doctor_id: appt.doctor_id, fee_sar: fee,
        });
        return appt.toObject();
      },
    });
  }

  // ===== Waitlist (P22.6 — persistent, auto-offer on cancellation) =====
  private requireWaitlist() {
    if (!this.waitlist) throw new ServiceUnavailableException('waitlist_unavailable');
    return this.waitlist;
  }

  /**
   * Join the waitlist for a doctor+day. Idempotent by key: replaying the same
   * key returns the original entry; joining twice without a key returns the
   * live entry instead of duplicating it.
   */
  async joinWaitlist(user: { id: string }, body: { doctorId: string; date: string; idempotency_key: string }) {
    if (!body?.doctorId || !body?.date) {
      throw new BadRequestException('doctorId and date are required');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date))) throw new BadRequestException('date_must_be_YYYY-MM-DD');
    const key = String(body?.idempotency_key ?? '').trim();
    if (!key) throw new BadRequestException('idempotency_key_required');
    const store = this.requireWaitlist();
    const byKey = await store.findOne({ idempotency_key: { $eq: key } });
    if (byKey) {
      const row = byKey.toObject();
      if (String(row.patient_id) !== String(user.id)) throw new ConflictException('idempotency_key_reused');
      return row;
    }
    const live = await store.findOne({
      doctor_id: { $eq: String(body.doctorId) },
      slot_date: { $eq: String(body.date) },
      patient_id: { $eq: String(user.id) },
      status: { $in: ['WAITING', 'OFFERED'] },
    });
    if (live) return live.toObject();
    const doctor = await this.providerModel.findOne({ id: String(body.doctorId), type: ProviderType.DOCTOR, status: ProviderStatus.ACTIVE });
    if (!doctor) throw new NotFoundException('doctor_not_found');
    try {
      const created = await store.create({
        doctor_id: String(body.doctorId),
        slot_date: String(body.date),
        patient_id: String(user.id),
        status: 'WAITING',
        idempotency_key: key,
      });
      const out = created.toObject();
      this.events.emit('appointment.waitlist.joined', { entry_id: out.id, patient_id: user.id, doctor_id: out.doctor_id, date: out.slot_date });
      this.logger.log(`Patient ${user.id} joined waitlist for doctor ${body.doctorId} on ${body.date}`);
      return out;
    } catch (e: unknown) {
      if ((e as { code?: number })?.code === 11000) {
        const winner = await store.findOne({ idempotency_key: { $eq: key } });
        if (winner) return winner.toObject();
      }
      throw e;
    }
  }

  async leaveWaitlist(user: { id: string; role?: string }, entryId: string) {
    const store = this.requireWaitlist();
    const entry = await store.findOne({ id: { $eq: String(entryId) } });
    if (!entry) throw new NotFoundException('waitlist_entry_not_found');
    const admin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
    if (String(entry.patient_id) !== String(user.id) && !admin) throw new ForbiddenException('not_your_waitlist_entry');
    if (!['WAITING', 'OFFERED'].includes(String(entry.status))) throw new BadRequestException('entry_not_active');
    entry.status = 'LEFT';
    await entry.save();
    this.events.emit('appointment.waitlist.left', { entry_id: entry.id, patient_id: entry.patient_id });
    return { id: entry.id, status: 'LEFT' };
  }

  /**
   * Flip the oldest WAITING entry for a freed (doctor, day) to OFFERED with an
   * expiry. The update filter is atomic — two patients racing for one freed
   * slot produce exactly one OFFERED row.
   */
  async offerNextOnCancellation(doctorId: string, slotDate: string, freedSlotStart: Date): Promise<Record<string, unknown> | null> {
    if (!this.waitlist) return null;
    const policy = await this.getNoShowPolicy();
    const ttlMs = policy.waitlist_offer_ttl_minutes * 60_000;
    const next = await this.waitlist.findOne({
      doctor_id: { $eq: String(doctorId) },
      slot_date: { $eq: String(slotDate) },
      status: { $eq: 'WAITING' },
    }).sort({ createdAt: 1 });
    if (!next) return null;
    const candidate = next.toObject() as { id: string };
    const won = await this.waitlist.findOneAndUpdate(
      { id: { $eq: candidate.id }, status: { $eq: 'WAITING' } },
      { $set: { status: 'OFFERED', offer_expires_at: new Date(Date.now() + ttlMs), offered_slot_start: new Date(freedSlotStart) } },
      { new: true },
    );
    if (!won) return null; // lost the race — the winner's offer stands
    const out = won.toObject() as { id: string; patient_id: string };
    this.events.emit('appointment.waitlist.offered', {
      entry_id: out.id, patient_id: out.patient_id, doctor_id: String(doctorId),
      slot_date: String(slotDate), offer_expires_at: (out as { offer_expires_at?: Date }).offer_expires_at,
    });
    return out as unknown as Record<string, unknown>;
  }

  async acceptOffer(user: { id: string }, entryId: string) {
    const store = this.requireWaitlist();
    const entry = await store.findOne({ id: { $eq: String(entryId) } });
    if (!entry) throw new NotFoundException('waitlist_entry_not_found');
    if (String(entry.patient_id) !== String(user.id)) throw new ForbiddenException('not_your_waitlist_entry');
    if (entry.status !== 'OFFERED') throw new BadRequestException('no_active_offer');
    if (entry.offer_expires_at && new Date(entry.offer_expires_at).getTime() < Date.now()) {
      entry.status = 'EXPIRED';
      await entry.save();
      throw new BadRequestException('offer_expired');
    }
    entry.status = 'CONSUMED';
    await entry.save();
    this.events.emit('appointment.waitlist.consumed', { entry_id: entry.id, patient_id: entry.patient_id });
    return {
      id: entry.id, status: 'CONSUMED', doctor_id: entry.doctor_id,
      slot_date: entry.slot_date, offered_slot_start: entry.offered_slot_start ?? null,
    };
  }

  /** Expire stale offers and cascade to the next waiter (5-min cron + cancel path). */
  async sweepExpiredOffers(now: Date = new Date()): Promise<{ expired: number; reoffered: number }> {
    if (!this.waitlist) return { expired: 0, reoffered: 0 };
    const stale = await this.waitlist.find(
      { status: { $eq: 'OFFERED' }, offer_expires_at: { $lt: now } },
      { id: 1, doctor_id: 1, slot_date: 1, offered_slot_start: 1 },
    ).limit(200);
    let expired = 0;
    let reoffered = 0;
    for (const doc of stale) {
      const row = doc.toObject() as { id: string; doctor_id: string; slot_date: string; offered_slot_start?: Date };
      const res = await this.waitlist.updateOne(
        { id: { $eq: row.id }, status: { $eq: 'OFFERED' } },
        { $set: { status: 'EXPIRED' } },
      );
      const modified = Number((res as unknown as { modifiedCount?: number })?.modifiedCount ?? 0);
      if (modified > 0) {
        expired += 1;
        const next = await this.offerNextOnCancellation(row.doctor_id, row.slot_date, row.offered_slot_start ? new Date(row.offered_slot_start) : now);
        if (next) reoffered += 1;
      }
    }
    return { expired, reoffered };
  }

  // ===== Doctor-running-late notices (P22.6) =====
  /**
   * Provider-triggered late notice. The owning doctor (or admin) declares the
   * delay; the patient is notified through the existing notification pipeline
   * via the `appointment.doctor_running_late` event (read-only use — the
   * notifications module owns delivery).
   */
  async reportLate(actor: { id: string; role: string }, id: string, delayMinutes: number) {
    const appt = await this.apptModel.findOne({ id });
    if (!appt) throw new NotFoundException();
    const owned = await this.isDoctorOwner(appt, actor);
    const admin = actor?.role === UserRole.ADMIN || actor?.role === UserRole.SUPER_ADMIN;
    if (!owned && !admin) throw new ForbiddenException('doctor_or_admin_only');
    if (![APPT_STATES.CONFIRMED, APPT_STATES.CHECKED_IN].includes(appt.status)) {
      throw new BadRequestException('late_notice_requires_upcoming_visit');
    }
    const delay = Math.floor(Number(delayMinutes));
    if (!Number.isFinite(delay) || delay < 5 || delay > 180) throw new BadRequestException('delay_minutes_out_of_range');
    appt.late_delay_minutes = delay;
    appt.late_reported_at = new Date();
    appt.late_reported_by = String(actor.id);
    appt.late_auto = false;
    await appt.save();
    this.events.emit('appointment.doctor_running_late', {
      id: appt.id, patient_id: appt.patient_id, doctor_id: appt.doctor_id,
      delay_minutes: delay, auto: false,
    });
    return { id: appt.id, delay_minutes: delay, auto: false };
  }

  /**
   * Automatic threshold: CONFIRMED visits still unstarted past
   * late_threshold_minutes get one auto notice. Runs on the 5-min cron;
   * each appointment is flagged once (late_reported_at set).
   */
  async applyAutoLateNotices(now: Date = new Date()): Promise<{ flagged: number }> {
    const policy = await this.getNoShowPolicy();
    const cutoff = new Date(now.getTime() - policy.late_threshold_minutes * 60_000);
    const due = await this.apptModel.find({
      status: { $eq: APPT_STATES.CONFIRMED },
      slot_start: { $lt: cutoff },
    }).limit(100);
    let flagged = 0;
    for (const doc of due as unknown as Array<{
      id: string; patient_id: string; doctor_id: string; slot_start: Date;
      late_reported_at?: Date; late_delay_minutes?: number; late_auto?: boolean; save: () => Promise<unknown>; toObject: () => Record<string, unknown>;
    }>) {
      if (doc.late_reported_at) continue;
      const delay = Math.max(5, Math.round((now.getTime() - new Date(doc.slot_start).getTime()) / 60_000));
      doc.late_delay_minutes = Math.min(180, delay);
      doc.late_reported_at = now;
      doc.late_auto = true;
      try {
        await doc.save();
      } catch {
        continue; // lost a concurrent flag race — the winner's notice stands
      }
      flagged += 1;
      this.events.emit('appointment.doctor_running_late', {
        id: doc.id, patient_id: doc.patient_id, doctor_id: doc.doctor_id,
        delay_minutes: doc.late_delay_minutes, auto: true,
      });
    }
    return { flagged };
  }

  /** 5-min ops sweep: expire stale waitlist offers + flag late visits. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async appointmentQualitySweep() {
    try {
      await this.sweepExpiredOffers();
    } catch (e) {
      this.logger.warn(`waitlist sweep failed: ${(e as Error)?.message}`);
    }
    try {
      await this.applyAutoLateNotices();
    } catch (e) {
      this.logger.warn(`auto-late sweep failed: ${(e as Error)?.message}`);
    }
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
