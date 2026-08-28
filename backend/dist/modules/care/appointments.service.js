"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AppointmentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const enums_1 = require("../../common/enums");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const appointment_repository_1 = require("./repositories/appointment.repository");
const providerprofile_repository_1 = require("./repositories/providerprofile.repository");
const PLATFORM_FEES = {
    service_fee: 15,
    home_visit_fee: 100,
    transportation_fee: 50,
};
let AppointmentsService = AppointmentsService_1 = class AppointmentsService {
    constructor(apptModel, providerModel, connection, events, engine) {
        this.apptModel = apptModel;
        this.providerModel = providerModel;
        this.connection = connection;
        this.events = events;
        this.engine = engine;
        this.logger = new common_1.Logger(AppointmentsService_1.name);
    }
    async assertFamilyBookingRight(bookerId, patientId) {
        const group = await this.connection.db.collection('family_groups').findOne({
            is_deleted: { $ne: true },
            'members.user_id': { $all: [bookerId, patientId] },
        });
        if (!group)
            throw new common_1.ForbiddenException('patient is not a member of your family group');
        if (group.owner_id === bookerId)
            return;
        const me = (group.members || []).find((m) => m.user_id === bookerId);
        if (!me?.permissions?.includes('booking')) {
            throw new common_1.ForbiddenException('you do not have the booking permission for this member');
        }
    }
    async create(user, body) {
        if (!body?.doctor_id || !body?.service_type || !body?.slot_start) {
            throw new common_1.BadRequestException('doctor_id, service_type, slot_start required');
        }
        let patientId = user.id;
        let bookedBy;
        if (body.for_member_id && body.for_member_id !== user.id) {
            await this.assertFamilyBookingRight(user.id, body.for_member_id);
            patientId = body.for_member_id;
            bookedBy = user.id;
        }
        const pm = body.payment_method || (body.service_type === 'clinic' ? 'cash' : 'card');
        const svcCtx = body.service_type === 'video' ? 'online_consultation' : body.service_type === 'home' ? 'home_visit' : 'in_clinic';
        const allowed = {
            online_consultation: ['card'],
            home_visit: ['card', 'insurance'],
            in_clinic: ['cash', 'card', 'insurance'],
        };
        if (!allowed[svcCtx].includes(pm)) {
            throw new common_1.BadRequestException(`payment_method_${pm}_not_allowed_for_${svcCtx}`);
        }
        const doctor = await this.providerModel.findOne({ id: body.doctor_id, type: enums_1.ProviderType.DOCTOR, status: enums_1.ProviderStatus.ACTIVE });
        if (!doctor)
            throw new common_1.NotFoundException('doctor_not_found');
        if (!doctor.consultation_modes?.includes(body.service_type)) {
            throw new common_1.BadRequestException(`doctor does not support service_type=${body.service_type}`);
        }
        const slotStart = new Date(body.slot_start);
        if (isNaN(slotStart.getTime()) || slotStart.getTime() < Date.now() + 5 * 60_000) {
            throw new common_1.BadRequestException('slot_start must be in the future');
        }
        if (slotStart.getMinutes() % 15 !== 0 || slotStart.getSeconds() !== 0 || slotStart.getMilliseconds() !== 0) {
            throw new common_1.BadRequestException('slot_start must be exactly on a 15-minute boundary (e.g., 00, 15, 30, 45)');
        }
        const duration = body.duration_minutes || 30;
        const slotEnd = new Date(slotStart.getTime() + duration * 60_000);
        const paddedEnd = new Date(slotEnd.getTime() + 5 * 60_000);
        const overlapping = await this.apptModel.findOne({
            doctor_id: doctor.id,
            status: { $in: [appointment_schema_1.APPT_STATES.PENDING, appointment_schema_1.APPT_STATES.CONFIRMED, appointment_schema_1.APPT_STATES.CHECKED_IN, appointment_schema_1.APPT_STATES.IN_PROGRESS] },
            $or: [
                { slot_start: { $lt: paddedEnd }, slot_end: { $gt: slotStart } },
            ]
        });
        if (overlapping) {
            throw new common_1.ConflictException('slot_already_booked_or_conflicts_with_buffer');
        }
        if (body.service_type === 'home' && body.visit_location && !body.visit_location?.lat) {
            throw new common_1.BadRequestException('visit_location.lat required when visit_location is provided');
        }
        const priceMap = {
            clinic: doctor.price_clinic,
            video: doctor.price_online,
            home: doctor.price_home,
        };
        const price = priceMap[body.service_type];
        if (price === undefined || price === null) {
            throw new common_1.BadRequestException(`no price configured for service_type=${body.service_type}`);
        }
        const service_fee = PLATFORM_FEES.service_fee;
        const home_visit_fee = body.service_type === 'home' ? PLATFORM_FEES.home_visit_fee : 0;
        const transportation_fee = body.service_type === 'home' ? PLATFORM_FEES.transportation_fee : 0;
        const total_price = price + service_fee + home_visit_fee + transportation_fee;
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
                status: appointment_schema_1.APPT_STATES.PENDING,
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
                    { state: appointment_schema_1.APPT_STATES.PENDING, at: new Date(), by_user_id: user.id, by_role: user.role || enums_1.UserRole.PATIENT, note: 'created' },
                ],
            });
            await this.engine.announceCreated({ kind: 'consultation', entity_id: appt.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: patientId, meta: { doctor_id: doctor.id, service_type: body.service_type, slot_start: slotStart, price, total_price } });
            if (pm !== 'card') {
                await this.transition(appt.id, appointment_schema_1.APPT_STATES.CONFIRMED, { id: 'system', role: 'system' }, `auto-confirmed (${pm})`);
                this.events.emit('appointment.confirmed', { id: appt.id });
            }
            const refreshed = await this.apptModel.findOne({ id: appt.id }, { _id: 0, __v: 0 });
            this.events.emit('appointment.created', { id: appt.id, patient_id: patientId, doctor_id: doctor.id, total_price });
            return refreshed?.toObject();
        }
        catch (e) {
            if (e?.code === 11000) {
                throw new common_1.ConflictException('slot_already_booked');
            }
            throw e;
        }
    }
    async isDoctorOwner(appt, user) {
        const profile = await this.providerModel.findOne({ id: appt.doctor_id, type: enums_1.ProviderType.DOCTOR });
        if (!profile)
            return false;
        const actorIds = [user?.id, user?.account_id, user?.provider_id, user?.provider_profile_id].filter(Boolean);
        const doctorIds = [profile.id, profile.user_id, profile.account_id].filter(Boolean);
        return actorIds.some((id) => doctorIds.includes(id));
    }
    async assertAppointmentAccess(appt, user) {
        if (user?.role === enums_1.UserRole.ADMIN || user?.role === enums_1.UserRole.SUPER_ADMIN)
            return;
        if (appt.patient_id === user?.id)
            return;
        if (await this.isDoctorOwner(appt, user))
            return;
        throw new common_1.ForbiddenException();
    }
    async listMine(user, status) {
        const q = {};
        if (user.role === enums_1.UserRole.ADMIN) {
        }
        else if (user.role === enums_1.UserRole.DOCTOR || user.provider_type === enums_1.ProviderType.DOCTOR || user.providerType === enums_1.ProviderType.DOCTOR) {
            const profile = await this.providerModel.findOne({
                type: enums_1.ProviderType.DOCTOR,
                $or: [{ user_id: user.id }, { account_id: user.id }, { id: user.id }],
            });
            if (!profile)
                return [];
            q.doctor_id = profile.id;
        }
        else {
            q.patient_id = user.id;
        }
        if (status)
            q.status = status;
        return this.apptModel.find(q, { _id: 0, __v: 0 }).sort({ slot_start: -1 }).limit(200);
    }
    async one(user, id) {
        const appt = await this.apptModel.findOne({ id }, { _id: 0, __v: 0 });
        if (!appt)
            throw new common_1.NotFoundException();
        await this.assertAppointmentAccess(appt, user);
        const obj = appt.toObject();
        const doctor = await this.providerModel.findOne({ id: obj.doctor_id, type: enums_1.ProviderType.DOCTOR }, { name_ar: 1, specialty_ar: 1, specialty: 1, name: 1, _id: 0 });
        if (doctor) {
            obj.doctor_name = doctor.name_ar || doctor.name;
            obj.specialty_ar = doctor.specialty_ar || doctor.specialty;
        }
        obj.queue_position = '٣';
        obj.ahead_count = '٢';
        obj.wait_time = '١٥';
        return obj;
    }
    async transition(id, to, actor, note) {
        const appt = await this.apptModel.findOne({ id });
        if (!appt)
            throw new common_1.NotFoundException();
        const isInternalSystemTransition = actor?.id === 'system' && actor?.role === 'system';
        if (!isInternalSystemTransition)
            await this.assertAppointmentAccess(appt, actor);
        const allowed = appointment_schema_1.APPT_TRANSITIONS[appt.status] || [];
        if (!allowed.includes(to)) {
            throw new common_1.BadRequestException(`Invalid transition ${appt.status} → ${to}`);
        }
        return await this.engine.apply({
            kind: 'consultation', entity_id: appt.id, from_domain: appt.status, to_domain: to,
            actor_account_id: actor.id, actor_role: actor.role, patient_account_id: appt.patient_id, reason: note,
            mutate: async () => {
                appt.status = to;
                appt.state_history.push({ state: to, at: new Date(), by_user_id: actor.id, by_role: actor.role, note });
                if (to === appointment_schema_1.APPT_STATES.CONFIRMED)
                    appt.confirmed_at = new Date();
                if (to === appointment_schema_1.APPT_STATES.COMPLETED)
                    appt.completed_at = new Date();
                await appt.save();
                this.events.emit(`appointment.${to.toLowerCase()}`, { id, actor: actor.id });
                return appt.toObject();
            },
        });
    }
    async cancel(id, user, reason, isNoShow = false) {
        const appt = await this.apptModel.findOne({ id });
        if (!appt)
            throw new common_1.NotFoundException();
        await this.assertAppointmentAccess(appt, user);
        let refundPercentage = 0;
        let penaltyAmount = 0;
        let refundDestination = 'source';
        const now = new Date();
        const slotStart = new Date(appt.slot_start);
        const hoursUntilAppointment = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (isNoShow || reason === 'no_show') {
            refundPercentage = 0;
        }
        else if (user.role === enums_1.UserRole.PATIENT || user.id === appt.patient_id) {
            if (hoursUntilAppointment > 24) {
                refundPercentage = 100;
                refundDestination = 'source';
            }
            else {
                refundPercentage = 50;
                refundDestination = 'wallet';
            }
        }
        else if (user.role === enums_1.UserRole.DOCTOR || user.id === appt.doctor_user_id) {
            refundPercentage = 100;
            refundDestination = 'source';
            penaltyAmount = 50;
        }
        appt.cancellation_reason = reason || '';
        appt.refund_percentage = refundPercentage;
        appt.refund_destination = refundDestination;
        appt.doctor_penalty = penaltyAmount;
        await appt.save();
        this.events.emit('appointment.refund.calculated', {
            appointment_id: id,
            patient_id: appt.patient_id,
            doctor_id: appt.doctor_id,
            total_price: appt.total_price,
            refund_percentage: refundPercentage,
            refund_destination: refundDestination,
            penalty_amount: penaltyAmount
        });
        return this.transition(id, appointment_schema_1.APPT_STATES.CANCELLED, user, reason);
    }
    async confirm(id, user) {
        return this.transition(id, appointment_schema_1.APPT_STATES.CONFIRMED, user, 'doctor-confirmed');
    }
    async checkIn(id, user) {
        return this.transition(id, appointment_schema_1.APPT_STATES.CHECKED_IN, user);
    }
    async start(id, user) {
        return this.transition(id, appointment_schema_1.APPT_STATES.IN_PROGRESS, user);
    }
    async complete(id, user) {
        return this.transition(id, appointment_schema_1.APPT_STATES.COMPLETED, user);
    }
    async finish(id, body, user) {
        const appt = await this.apptModel.findOne({ id });
        if (!appt)
            throw new common_1.NotFoundException();
        await this.assertAppointmentAccess(appt, user);
        if (body && (body.diagnosis || body.notes || body.recommendations || (Array.isArray(body.prescription) && body.prescription.length))) {
            appt.summary = {
                diagnosis: body.diagnosis, notes: body.notes, recommendations: body.recommendations,
                prescription: Array.isArray(body.prescription) ? body.prescription : [],
                follow_up_recommended: !!body.follow_up_recommended,
                follow_up_window_days: body.follow_up_window_days != null ? Number(body.follow_up_window_days) : undefined,
                written_at: new Date(),
            };
            await appt.save();
        }
        const done = await this.transition(id, appointment_schema_1.APPT_STATES.COMPLETED, user);
        return { success: true, appointment: done };
    }
    async getSummary(id, user) {
        const appt = await this.apptModel.findOne({ id });
        if (!appt)
            throw new common_1.NotFoundException();
        if (user.role !== enums_1.UserRole.ADMIN && appt.patient_id !== user.id && appt.doctor_user_id !== user.id)
            throw new common_1.ForbiddenException();
        if (!appt.summary || !(appt.summary.diagnosis || appt.summary.notes || (appt.summary.prescription || []).length)) {
            throw new common_1.NotFoundException('summary not available yet');
        }
        return { doctor_id: appt.doctor_id, ...appt.summary };
    }
    async reschedule(id, user, body) {
        const appt = await this.apptModel.findOne({ id });
        if (!appt)
            throw new common_1.NotFoundException();
        if (user.role !== enums_1.UserRole.ADMIN && appt.patient_id !== user.id && appt.doctor_user_id !== user.id) {
            throw new common_1.ForbiddenException();
        }
        if ([appointment_schema_1.APPT_STATES.CANCELLED, appointment_schema_1.APPT_STATES.COMPLETED, appointment_schema_1.APPT_STATES.RESCHEDULED].includes(appt.status)) {
            throw new common_1.BadRequestException('cannot_reschedule');
        }
        const newStart = new Date(body.slot_start);
        if (isNaN(newStart.getTime()) || newStart.getTime() < Date.now() + 5 * 60_000) {
            throw new common_1.BadRequestException('slot_start must be in the future');
        }
        if (newStart.getMinutes() % 15 !== 0 || newStart.getSeconds() !== 0 || newStart.getMilliseconds() !== 0) {
            throw new common_1.BadRequestException('slot_start must be exactly on a 15-minute boundary');
        }
        const newEnd = new Date(newStart.getTime() + appt.duration_minutes * 60_000);
        const paddedEnd = new Date(newEnd.getTime() + 5 * 60_000);
        const overlapping = await this.apptModel.findOne({
            doctor_id: appt.doctor_id,
            status: { $in: [appointment_schema_1.APPT_STATES.PENDING, appointment_schema_1.APPT_STATES.CONFIRMED, appointment_schema_1.APPT_STATES.CHECKED_IN, appointment_schema_1.APPT_STATES.IN_PROGRESS] },
            $or: [{ slot_start: { $lt: paddedEnd }, slot_end: { $gt: newStart } }],
        });
        if (overlapping)
            throw new common_1.ConflictException('slot_already_booked_or_conflicts_with_buffer');
        const fresh = await this.apptModel.create({
            patient_id: appt.patient_id,
            doctor_id: appt.doctor_id,
            doctor_user_id: appt.doctor_user_id,
            service_type: appt.service_type,
            slot_start: newStart,
            slot_end: newEnd,
            duration_minutes: appt.duration_minutes,
            status: appointment_schema_1.APPT_STATES.CONFIRMED,
            price: appt.price,
            service_fee: appt.service_fee || 0,
            home_visit_fee: appt.home_visit_fee || 0,
            transportation_fee: appt.transportation_fee || 0,
            total_price: appt.total_price || appt.price,
            rescheduled_from_id: appt.id,
            state_history: [{ state: appointment_schema_1.APPT_STATES.CONFIRMED, at: new Date(), by_user_id: user.id, by_role: user.role, note: 'rescheduled-from-' + appt.id }],
        });
        try {
            appt.status = appointment_schema_1.APPT_STATES.RESCHEDULED;
            appt.state_history.push({ state: appointment_schema_1.APPT_STATES.RESCHEDULED, at: new Date(), by_user_id: user.id, by_role: user.role, note: 'rescheduled' });
            await appt.save();
        }
        catch (error) {
            await this.apptModel.deleteOne({ id: fresh.id }).catch(() => null);
            throw error;
        }
        return fresh.toObject();
    }
    async joinWaitlist(user, body) {
        if (!body?.doctorId || !body?.date) {
            throw new common_1.BadRequestException('doctorId and date are required');
        }
        this.events.emit('appointment.waitlist.joined', {
            patient_id: user.id,
            doctor_id: body.doctorId,
            date: body.date,
        });
        this.logger.log(`Patient ${user.id} joined waitlist for doctor ${body.doctorId} on ${body.date}`);
        return { success: true, message: 'Joined waitlist successfully' };
    }
    async onPaymentCompleted(payload) {
        if (payload.booking_kind !== 'consultation' || !payload.booking_id)
            return;
        const appt = await this.apptModel.findOne({ id: payload.booking_id });
        if (!appt) {
            this.logger.warn(`payment.completed: appointment ${payload.booking_id} not found`);
            return;
        }
        if (appt.status !== appointment_schema_1.APPT_STATES.PENDING) {
            this.logger.log(`payment.completed: appointment ${appt.id} already ${appt.status}, skipping`);
            return;
        }
        appt.payment_status = 'paid';
        await appt.save();
        await this.transition(appt.id, appointment_schema_1.APPT_STATES.CONFIRMED, { id: 'system', role: 'system' }, 'payment-confirmed');
        this.events.emit('appointment.confirmed', { id: appt.id });
        this.logger.log(`payment.completed: appointment ${appt.id} confirmed after payment ${payload.transaction_id}`);
    }
};
exports.AppointmentsService = AppointmentsService;
__decorate([
    (0, event_emitter_1.OnEvent)('payment.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppointmentsService.prototype, "onPaymentCompleted", null);
exports.AppointmentsService = AppointmentsService = AppointmentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('AppointmentRepository')),
    __param(1, (0, common_1.Inject)('ProviderProfileRepository')),
    __param(2, (0, mongoose_2.InjectConnection)()),
    __metadata("design:paramtypes", [appointment_repository_1.AppointmentRepository,
        providerprofile_repository_1.ProviderProfileRepository,
        mongoose_1.Connection,
        event_emitter_1.EventEmitter2,
        workflow_engine_module_1.WorkflowEngineService])
], AppointmentsService);
//# sourceMappingURL=appointments.service.js.map