import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException, Logger, Inject, Optional } from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Appointment, AppointmentDocument, APPT_STATES, APPT_TRANSITIONS, ApptState, ServiceType } from '../../schemas/appointment.schema';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { UserRole, ProviderType, ProviderStatus } from '../../common/enums';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { InsuranceFlowService } from '../insurance-engine/insurance-engine.module';
import { SlotLocksService } from '../slot-locks/slot-locks.module';
import { AppointmentRepository } from "./repositories/appointment.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { hasEffectiveRole } from '../../common/auth.guard';

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
 * F1 — atomic padded-window hold (the ONLY overlap backstop that survives a race).
 *
 * The overlap `findOne` in create()/reschedule() is check-then-act: two
 * concurrent requests with overlapping-but-different starts (10:00 vs 10:15
 * inside the 5-min buffer window) both read "no overlap" and both persist —
 * the unique index on exact `(doctor_id, slot_start)` cannot see the range
 * overlap. Transactions don't fix this either (snapshot isolation has no
 * predicate lock; two concurrent txns both read empty and both commit).
 *
 * So every create first inserts ONE hold document carrying every 1-minute
 * bucket of its padded window `[slotStart, paddedEnd)`:
 *   key = `appt-hold:<doctor_id>:<epochMinute>`
 * under a UNIQUE multikey index on `keys`. Single-document inserts are
 * atomic in MongoDB, so of two overlapping requests exactly one insert
 * succeeds and the loser gets 11000 → 409. Minute buckets are EXACT for
 * minute-aligned windows (all booking boundaries are whole minutes):
 * overlapping windows always share ≥1 bucket, merely-touching windows share
 * none — no false 409s, no misses.
 *
 * Lifecycle: the hold is deleted right after the appointment row commits, so
 * steady state holds ~0 documents; `expires_at` (+TTL) bounds a crash orphan
 * to APPOINTMENT_HOLD_TTL_MS. The legacy overlap `findOne` stays as defence
 * in depth (catches rows committed before holds existed).
 */
export const APPOINTMENT_HOLD_BUCKET_MINUTES = 1;
export const APPOINTMENT_HOLD_TTL_MS = 60_000;
export const APPOINTMENT_HOLD_COLLECTION = 'appointment_slot_holds';

/** Every 1-minute bucket key covered by the half-open padded window. */
export function paddedWindowKeys(doctorId: string, slotStart: Date, paddedEnd: Date): string[] {
  const keys: string[] = [];
  const startMin = Math.floor(slotStart.getTime() / 60_000);
  const endMin = Math.ceil(paddedEnd.getTime() / 60_000);
  for (let m = startMin; m < endMin; m += APPOINTMENT_HOLD_BUCKET_MINUTES) {
    keys.push(`appt-hold:${doctorId}:${m}`);
  }
  return keys;
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
  /** Process-wide guard so the hold indexes are created at most once. */
  private static holdIndexesEnsured = false;

  constructor(
    @Inject('AppointmentRepository') private apptModel: AppointmentRepository,
    @Inject('ProviderProfileRepository') private providerModel: ProviderProfileRepository,
    @InjectConnection() private connection: Connection,
    private events: EventEmitter2,
    private engine: WorkflowEngineService,
    private insurance: InsuranceFlowService,
    @Optional() private locks?: SlotLocksService,
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
      this.logger.warn(`slot-hold check unavailable, allowing booking to proceed: ${(e as any)?.message}`);
      return;
    }
    if (blocking) throw new ConflictException('slot_held');
  }

  /**
   * F1 — claim the padded window atomically. Returns a releaser, or null when
   * the holds collection is unreachable (fail-open to the legacy overlap
   * check, same precedent as assertNoForeignSlotHold above). A 11000 here
   * means another request holds an overlapping padded window → 409.
   */
  private async claimPaddedWindow(
    doctorId: string,
    slotStart: Date,
    paddedEnd: Date,
  ): Promise<(() => Promise<void>) | null> {
    try {
      const raw = this.connection as any;
      const col = typeof raw?.collection === 'function' ? raw.collection(APPOINTMENT_HOLD_COLLECTION) : null;
      if (!col || typeof col.insertOne !== 'function') return null;
      if (!AppointmentsService.holdIndexesEnsured && typeof col.createIndex === 'function') {
        try {
          await col.createIndex({ keys: 1 }, { unique: true, name: 'appt_hold_keys_unique' });
          await col.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0, name: 'appt_hold_ttl' });
          AppointmentsService.holdIndexesEnsured = true;
        } catch {
          // Index-build races (two processes creating at once) are benign.
        }
      }
      const keys = paddedWindowKeys(doctorId, slotStart, paddedEnd);
      const owner = randomUUID();
      await col.insertOne({
        keys,
        doctor_id: doctorId,
        slot_start: slotStart,
        padded_end: paddedEnd,
        owner,
        created_at: new Date(),
        expires_at: new Date(Date.now() + APPOINTMENT_HOLD_TTL_MS),
      });
      return async () => {
        try { await col.deleteOne({ owner }); } catch { /* best-effort */ }
      };
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException('slot_already_booked_or_conflicts_with_buffer');
      }
      this.logger.warn(`padded-window hold unavailable, falling back to overlap check: ${(e as any)?.message}`);
      return null;
    }
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

    // F1 — atomic claim BEFORE the read check: concurrent overlapping
    // requests serialize on the hold insert (11000 loser → 409) instead of
    // both sailing through the findOne below. Released in `finally` on every
    // exit; a null hold means the collection was unreachable and the legacy
    // overlap check below is the backstop.
    const releaseHold = await this.claimPaddedWindow(doctor.id, slotStart, paddedEnd);
    try {
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
    // the query requires expires_at > now. Lookup failures fail open (logged)
    // — the overlap check + unique index above remain the hard backstop.
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
    } finally {
      if (releaseHold) await releaseHold();
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

    return this.transition(id, APPT_STATES.CANCELLED, user, reason);
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
    if (user.role !== UserRole.ADMIN && appt.patient_id !== user.id && appt.doctor_user_id !== user.id) throw new ForbiddenException();
    if (!appt.summary || !(appt.summary.diagnosis || appt.summary.notes || (appt.summary.prescription || []).length)) {
      throw new NotFoundException('summary not available yet');
    }
    return { doctor_id: appt.doctor_id, ...appt.summary };
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
    const newStart = new Date(body.slot_start);
    if (isNaN(newStart.getTime()) || newStart.getTime() < Date.now() + 5 * 60_000) {
      throw new BadRequestException('slot_start must be in the future');
    }
    if (newStart.getMinutes() % 15 !== 0 || newStart.getSeconds() !== 0 || newStart.getMilliseconds() !== 0) {
      throw new BadRequestException('slot_start must be exactly on a 15-minute boundary');
    }

    const newEnd = new Date(newStart.getTime() + appt.duration_minutes * 60_000);
    const paddedEnd = new Date(newEnd.getTime() + 5 * 60_000);
    // F1 — same atomic claim as create(): two concurrent reschedules into
    // overlapping windows serialize on the hold insert, not the findOne.
    const releaseHold = await this.claimPaddedWindow(appt.doctor_id, newStart, paddedEnd);
    try {
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
    const out = fresh.toObject();
    return out;
    } finally {
      if (releaseHold) await releaseHold();
    }
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
