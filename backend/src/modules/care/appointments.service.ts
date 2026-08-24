import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException, Logger, Inject } from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Appointment, AppointmentDocument, APPT_STATES, APPT_TRANSITIONS, ApptState, ServiceType } from '../../schemas/appointment.schema';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { UserRole, ProviderType, ProviderStatus } from '../../common/enums';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { AppointmentRepository } from "./repositories/appointment.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";

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

      await this.engine.announceCreated({ kind: 'consultation', entity_id: appt.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: patientId, meta: { doctor_id: doctor.id, service_type: body.service_type, slot_start: slotStart, price, total_price } });

      // Card payments stay PENDING until payment.completed webhook confirms.
      // Cash & insurance auto-confirm immediately (instant booking UX).
      if (pm !== 'card') {
        await this.transition(appt.id, APPT_STATES.CONFIRMED, { id: 'system', role: 'system' }, `auto-confirmed (${pm})`);
        this.events.emit('appointment.confirmed', { id: appt.id });
      }

      const refreshed = await this.apptModel.findOne({ id: appt.id }, { _id: 0, __v: 0 });
      this.events.emit('appointment.created', { id: appt.id, patient_id: patientId, doctor_id: doctor.id, total_price });
      return refreshed?.toObject();
    } catch (e: any) {
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

  private async assertAppointmentAccess(appt: any, user: any): Promise<void> {
    if (user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN) return;
    if (appt.patient_id === user?.id) return;
    if (await this.isDoctorOwner(appt, user)) return;
    throw new ForbiddenException();
  }

  /** ===== Read ===== */
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
    } else if (user.role === UserRole.DOCTOR || user.id === appt.doctor_user_id) {
      refundPercentage = 100;
      refundDestination = 'source';
      penaltyAmount = 50; // 50 SAR penalty applied to Doctor's wallet
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
