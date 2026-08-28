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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoctorsModule = exports.NotificationsController = exports.DoctorsController = exports.DoctorsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const doctors_schemas_1 = require("./doctors.schemas");
const event_bus_service_1 = require("../events/event-bus.service");
const SEED_DOCTORS = [
    { name_ar: 'د. أحمد السالم', name_en: 'Dr. Ahmed Al-Salem', specialty: 'general_medicine', specialty_ar: 'طب عام', gender: 'male', languages: ['ar', 'en'], consultation_fee: 80, home_visit_fee: 180, video_consultation_fee: 60, home_visit_enabled: true, video_enabled: true, voice_enabled: true, rating: 4.7, reviews_count: 128, insurance_supported: ['بوبا', 'التعاونية'], biography: 'استشاري طب أسرة بخبرة 15 سنة في الأمراض الشائعة والمزمنة.', tags: ['family', 'general'], clinic_location: { city: 'الرياض', name: 'مجمع نبض الطبي', lat: 24.7136, lng: 46.6753 } },
    { name_ar: 'د. سارة المطيري', specialty: 'pediatrics', specialty_ar: 'أطفال', gender: 'female', languages: ['ar', 'en'], consultation_fee: 120, video_consultation_fee: 90, home_visit_enabled: false, video_enabled: true, voice_enabled: true, rating: 4.9, reviews_count: 256, insurance_supported: ['بوبا', 'ميدغلف', 'التعاونية'], biography: 'استشارية أطفال وحديثي الولادة.', tags: ['kids', 'newborn'], clinic_location: { city: 'الرياض', name: 'مستشفى الأطفال' } },
    { name_ar: 'د. خالد الزهراني', specialty: 'cardiology', specialty_ar: 'قلب', gender: 'male', languages: ['ar'], consultation_fee: 200, home_visit_fee: 350, home_visit_enabled: true, video_enabled: false, voice_enabled: false, rating: 4.8, reviews_count: 89, insurance_supported: ['التعاونية'], biography: 'استشاري قلب وقسطرة.', tags: ['heart'], clinic_location: { city: 'جدة', name: 'مركز القلب' } },
    { name_ar: 'د. ليلى السبيعي', specialty: 'dermatology', specialty_ar: 'جلدية', gender: 'female', languages: ['ar', 'en'], consultation_fee: 150, video_consultation_fee: 100, home_visit_enabled: false, video_enabled: true, voice_enabled: false, rating: 4.6, reviews_count: 312, insurance_supported: ['بوبا', 'ميدغلف'], biography: 'استشارية جلدية وتجميل غير جراحي.', tags: ['skin', 'cosmetics'], clinic_location: { city: 'الرياض' } },
    { name_ar: 'د. عبدالعزيز الفهد', specialty: 'orthopedics', specialty_ar: 'عظام', gender: 'male', languages: ['ar'], consultation_fee: 180, home_visit_enabled: false, video_enabled: false, voice_enabled: true, rating: 4.5, reviews_count: 76, insurance_supported: ['التعاونية', 'سند'], biography: 'استشاري عظام ومفاصل.', tags: ['ortho'], clinic_location: { city: 'الدمام' } },
    { name_ar: 'د. نور القحطاني', specialty: 'gynecology', specialty_ar: 'نسائية وتوليد', gender: 'female', languages: ['ar', 'en'], consultation_fee: 160, video_consultation_fee: 110, home_visit_enabled: false, video_enabled: true, voice_enabled: true, rating: 4.9, reviews_count: 421, insurance_supported: ['بوبا', 'ميدغلف', 'التعاونية'], biography: 'استشارية نسائية وتوليد.', tags: ['women'], clinic_location: { city: 'الرياض' } },
];
const DEFAULT_SCHEDULE = {
    sun: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
    mon: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
    tue: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
    wed: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
    thu: [{ start: '09:00', end: '14:00' }],
};
function dayKey(d) { return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()]; }
function toHM(d) { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function fromHM(date, hm) { const [h, m] = hm.split(':').map(Number); const r = new Date(date); r.setHours(h, m, 0, 0); return r; }
let DoctorsService = class DoctorsService {
    constructor(doctors, appts, msgs, notes, notifs, bus) {
        this.doctors = doctors;
        this.appts = appts;
        this.msgs = msgs;
        this.notes = notes;
        this.notifs = notifs;
        this.bus = bus;
    }
    async onModuleInit() {
        if (process.env.SEED_DEMO_DATA !== 'true')
            return;
        const count = await this.doctors.countDocuments();
        if (count === 0) {
            for (const d of SEED_DOCTORS)
                await this.doctors.create({ ...d, weekly_schedule: DEFAULT_SCHEDULE });
        }
    }
    async pushNotification(recipient_account_id, recipient_role, type, title, body, entity_type, entity_id, deep_link) {
        try {
            await this.notifs.create({ recipient_account_id, recipient_role, type, title, body, entity_type, entity_id, deep_link });
        }
        catch { }
    }
    async listDoctors(filter) {
        const q = { is_accepting: true, is_deleted: { $ne: true }, status: 'published' };
        if (filter.specialty)
            q.specialty = filter.specialty;
        if (filter.gender)
            q.gender = filter.gender;
        if (filter.home === '1')
            q.home_visit_enabled = true;
        if (filter.video === '1')
            q.video_enabled = true;
        if (filter.insurance)
            q.insurance_supported = filter.insurance;
        if (filter.insurance_company)
            q.insurance_supported = { $regex: new RegExp(filter.insurance_company, 'i') };
        if (filter.search)
            q.$or = [{ name_ar: { $regex: filter.search, $options: 'i' } }, { name_en: { $regex: filter.search, $options: 'i' } }, { specialty_ar: { $regex: filter.search, $options: 'i' } }];
        return this.doctors.find(q, { _id: 0, __v: 0 }).sort({ rating: -1, reviews_count: -1 }).limit(100).lean();
    }
    async doctorDetail(id) {
        const d = await this.doctors.findOne({ id, is_deleted: { $ne: true }, status: 'published' }, { _id: 0, __v: 0 }).lean();
        if (!d)
            throw new common_1.NotFoundException();
        return d;
    }
    async specialties() {
        const list = await this.doctors.distinct('specialty');
        const out = [];
        for (const sp of list) {
            const sample = await this.doctors.findOne({ specialty: sp }, { specialty_ar: 1 }).lean();
            const count = await this.doctors.countDocuments({ specialty: sp });
            out.push({ key: sp, label_ar: sample?.specialty_ar || sp, count });
        }
        return out;
    }
    async availableSlots(doctorId, date) {
        const doctor = await this.doctors.findOne({ id: doctorId }).lean();
        if (!doctor)
            throw new common_1.NotFoundException();
        const day = new Date(date);
        if (doctor.blocked_dates?.includes(date))
            return [];
        const schedule = (doctor.weekly_schedule || DEFAULT_SCHEDULE)[dayKey(day)] || [];
        const dur = doctor.default_slot_minutes || 30;
        const slots = [];
        for (const block of schedule) {
            let cursor = fromHM(day, block.start);
            const end = fromHM(day, block.end);
            while (cursor < end) {
                const next = new Date(cursor.getTime() + dur * 60_000);
                if (next > end)
                    break;
                const hm = toHM(cursor);
                const inBreak = (block.breaks || []).some((br) => hm >= br.start && hm < br.end);
                if (!inBreak && cursor.getTime() > Date.now())
                    slots.push({ time: cursor.toISOString(), available: true });
                cursor = next;
            }
        }
        const existing = await this.appts.find({ doctor_id: doctorId, scheduled_at: { $gte: new Date(day.setHours(0, 0, 0, 0)), $lt: new Date(day.setHours(23, 59, 59, 999)) }, state: { $nin: ['cancelled', 'no_show'] } }).lean();
        const bookedMap = {};
        for (const a of existing)
            bookedMap[a.scheduled_at.toISOString()] = (bookedMap[a.scheduled_at.toISOString()] || 0) + 1;
        return slots.map(s => ({ ...s, available: (bookedMap[s.time] || 0) < (doctor.max_bookings_per_slot || 1) }));
    }
    async book(user, data) {
        if (!data.doctor_id || !data.scheduled_at || !data.type)
            throw new common_1.BadRequestException('missing_fields');
        const doctor = await this.doctors.findOne({ id: data.doctor_id }).lean();
        if (!doctor)
            throw new common_1.NotFoundException('doctor_not_found');
        if (!doctor.is_accepting)
            throw new common_1.BadRequestException('doctor_not_accepting');
        const scheduledAt = new Date(data.scheduled_at);
        const sameSlot = await this.appts.countDocuments({ doctor_id: data.doctor_id, scheduled_at: scheduledAt, state: { $nin: ['cancelled', 'no_show'] } });
        if (sameSlot >= (doctor.max_bookings_per_slot || 1))
            throw new common_1.BadRequestException('slot_full');
        const feeMap = { clinic: doctor.consultation_fee, home: doctor.home_visit_fee, video: doctor.video_consultation_fee || doctor.consultation_fee, voice: doctor.video_consultation_fee || doctor.consultation_fee };
        const fee = feeMap[data.type] || doctor.consultation_fee;
        const appt = await this.appts.create({
            doctor_id: data.doctor_id,
            patient_id: user.id,
            patient_name: data.contact?.name || user.full_name,
            patient_phone: data.contact?.phone || user.phone,
            type: data.type,
            scheduled_at: scheduledAt,
            duration_minutes: doctor.default_slot_minutes || 30,
            fee,
            payment_method: data.payment_method || 'cash',
            insurance_provider: data.insurance_provider,
            insurance_status: data.payment_method === 'insurance' ? 'pending' : 'none',
            documents: Array.isArray(data.documents) ? data.documents : [],
            reason: data.reason,
            address: data.address,
            state: 'scheduled',
            state_history: [{ from: '', to: 'scheduled', by: user.id, at: new Date() }],
        });
        this.bus.emit({ type: 'doctor_appointment.created', entity_type: 'doctor_appointment', entity_id: appt.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, pharmacy_account_id: doctor.provider_account_id, meta: { doctor_id: doctor.id, type: data.type, fee } }).catch(() => null);
        await this.pushNotification(doctor.provider_account_id || doctor.id, 'provider', 'doctor.new_appointment', 'موعد جديد', `${appt.patient_name} · ${data.type}`, 'doctor_appointment', appt.id, `/(provider)/control/doctor-inbox`);
        await this.pushNotification(user.id, 'patient', 'doctor.booking_confirmed', 'تم تأكيد طلب الموعد', doctor.name_ar, 'doctor_appointment', appt.id, `/doctors/appointment/${appt.id}`);
        return appt.toObject();
    }
    async myAppointments(user) {
        return this.appts.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ scheduled_at: -1 }).limit(100).lean();
    }
    async doctorInbox(user, status) {
        if (!['provider', 'doctor', 'admin'].includes(user.role))
            throw new common_1.ForbiddenException();
        const doctorIds = (await this.doctors.find({ account_id: user.id }, { id: 1 }).lean()).map((d) => d.id);
        const q = user.role === 'admin' ? {} : { doctor_id: { $in: doctorIds } };
        if (status)
            q.state = status;
        return this.appts.find(q, { _id: 0, __v: 0 }).sort({ scheduled_at: 1 }).limit(200).lean();
    }
    async transition(user, id, to) {
        const a = await this.appts.findOne({ id });
        if (!a)
            throw new common_1.NotFoundException();
        if (user.role === 'patient' && a.patient_id !== user.id)
            throw new common_1.ForbiddenException();
        a.state_history.push({ from: a.state, to, by: user.id, at: new Date() });
        a.state = to;
        await a.save();
        this.bus.emit({ type: `doctor_appointment.${to}`, entity_type: 'doctor_appointment', entity_id: a.id, actor_account_id: user.id, actor_role: user.role, patient_account_id: a.patient_id, meta: { doctor_id: a.doctor_id } }).catch(() => null);
        if (to === 'cancelled')
            await this.pushNotification(a.patient_id, 'patient', 'doctor.cancelled', 'تم إلغاء الموعد', a.patient_name);
        if (to === 'confirmed')
            await this.pushNotification(a.patient_id, 'patient', 'doctor.confirmed', 'تم تأكيد الموعد', a.patient_name);
        return a.toObject();
    }
    async appointmentDetail(user, id) {
        const a = await this.appts.findOne({ id }, { _id: 0, __v: 0 }).lean();
        if (!a)
            throw new common_1.NotFoundException();
        if (user.role === 'patient' && a.patient_id !== user.id)
            throw new common_1.ForbiddenException();
        const doctor = await this.doctors.findOne({ id: a.doctor_id }, { _id: 0, __v: 0 }).lean();
        const note = await this.notes.findOne({ appointment_id: id }, { _id: 0, __v: 0 }).lean();
        return { ...a, doctor, consultation_note: note };
    }
    async listMessages(user, appointment_id) {
        const a = await this.appts.findOne({ id: appointment_id }).lean();
        if (!a)
            throw new common_1.NotFoundException();
        if (user.role === 'patient' && a.patient_id !== user.id)
            throw new common_1.ForbiddenException();
        return this.msgs.find({ appointment_id }, { _id: 0, __v: 0 }).sort({ createdAt: 1 }).lean();
    }
    async postMessage(user, appointment_id, text) {
        if (!text?.trim())
            throw new common_1.BadRequestException('empty');
        if (/\b\d{8,}\b/.test(text) || /https?:\/\//i.test(text) || /(whatsapp|telegram|واتساب|تيلي)/i.test(text))
            throw new common_1.BadRequestException('content_blocked');
        const a = await this.appts.findOne({ id: appointment_id }).lean();
        if (!a)
            throw new common_1.NotFoundException();
        return this.msgs.create({ appointment_id, sender_account_id: user.id, sender_role: user.role, text });
    }
    async upsertNote(user, appointment_id, body) {
        if (!['provider', 'doctor', 'admin'].includes(user.role))
            throw new common_1.ForbiddenException();
        const a = await this.appts.findOne({ id: appointment_id });
        if (!a)
            throw new common_1.NotFoundException();
        const exists = await this.notes.findOne({ appointment_id });
        if (exists) {
            Object.assign(exists, body);
            await exists.save();
        }
        else {
            await this.notes.create({ appointment_id, doctor_id: a.doctor_id, patient_id: a.patient_id, ...body });
        }
        await this.pushNotification(a.patient_id, 'patient', 'doctor.prescription_ready', 'تم إصدار التقرير والوصفة', '', 'doctor_appointment', a.id, `/doctors/appointment/${a.id}`);
        return this.notes.findOne({ appointment_id }).lean();
    }
    async listNotifications(user) {
        return this.notifs.find({ recipient_account_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean();
    }
    async unreadCount(user) {
        const c = await this.notifs.countDocuments({ recipient_account_id: user.id, read: false });
        return { count: c };
    }
    async markRead(user, id) {
        await this.notifs.findOneAndUpdate({ id, recipient_account_id: user.id }, { $set: { read: true } });
        return { ok: true };
    }
    async markAllRead(user) {
        await this.notifs.updateMany({ recipient_account_id: user.id, read: false }, { $set: { read: true } });
        return { ok: true };
    }
    async setAvailability(user, data) {
        if (!['provider', 'doctor'].includes(user.role))
            throw new common_1.ForbiddenException();
        const $set = {};
        if (typeof data.is_online === 'boolean')
            $set.is_online = data.is_online;
        if (typeof data.is_accepting === 'boolean')
            $set.is_accepting = data.is_accepting;
        const r = await this.doctors.updateMany({ account_id: user.id }, { $set });
        this.bus.emit({ type: 'provider.availability_changed', entity_type: 'provider', entity_id: user.id, actor_account_id: user.id, actor_role: user.role, meta: $set }).catch(() => null);
        return { ok: true, updated: r.modifiedCount };
    }
};
exports.DoctorsService = DoctorsService;
exports.DoctorsService = DoctorsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Doctor')),
    __param(1, (0, mongoose_1.InjectModel)('DoctorAppointment')),
    __param(2, (0, mongoose_1.InjectModel)('DoctorChatMessage')),
    __param(3, (0, mongoose_1.InjectModel)('ConsultationNote')),
    __param(4, (0, mongoose_1.InjectModel)('NotificationItem')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        event_bus_service_1.EventBusService])
], DoctorsService);
let DoctorsController = class DoctorsController {
    constructor(svc) {
        this.svc = svc;
    }
    list(q) { return this.svc.listDoctors(q); }
    specs() { return this.svc.specialties(); }
    detail(id) { return this.svc.doctorDetail(id); }
    slots(id, date) { return this.svc.availableSlots(id, date); }
    book(body, user) { return this.svc.book(user, body); }
    mine(user) { return this.svc.myAppointments(user); }
    inbox(s, user) { return this.svc.doctorInbox(user, s); }
    ap(id, user) { return this.svc.appointmentDetail(user, id); }
    tr(id, body, user) { return this.svc.transition(user, id, body.state); }
    msgs(id, user) { return this.svc.listMessages(user, id); }
    postMsg(id, body, user) { return this.svc.postMessage(user, id, body.text); }
    note(id, body, user) { return this.svc.upsertNote(user, id, body); }
    avail(body, user) { return this.svc.setAvailability(user, body); }
};
exports.DoctorsController = DoctorsController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)(''),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DoctorsController.prototype, "list", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('specialties'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DoctorsController.prototype, "specs", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DoctorsController.prototype, "detail", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)(':id/slots'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DoctorsController.prototype, "slots", null);
__decorate([
    (0, common_1.Post)('appointments'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DoctorsController.prototype, "book", null);
__decorate([
    (0, common_1.Get)('appointments/mine'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DoctorsController.prototype, "mine", null);
__decorate([
    (0, common_1.Get)('appointments/inbox'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DoctorsController.prototype, "inbox", null);
__decorate([
    (0, common_1.Get)('appointments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DoctorsController.prototype, "ap", null);
__decorate([
    (0, common_1.Patch)('appointments/:id/state'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DoctorsController.prototype, "tr", null);
__decorate([
    (0, common_1.Get)('appointments/:id/messages'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DoctorsController.prototype, "msgs", null);
__decorate([
    (0, common_1.Post)('appointments/:id/messages'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DoctorsController.prototype, "postMsg", null);
__decorate([
    (0, common_1.Post)('appointments/:id/note'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DoctorsController.prototype, "note", null);
__decorate([
    (0, common_1.Patch)('availability'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DoctorsController.prototype, "avail", null);
exports.DoctorsController = DoctorsController = __decorate([
    (0, common_1.Controller)('doctors'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [DoctorsService])
], DoctorsController);
let NotificationsController = class NotificationsController {
    constructor(svc) {
        this.svc = svc;
    }
    list(user) { return this.svc.listNotifications(user); }
    unread(user) { return this.svc.unreadCount(user); }
    mr(id, user) { return this.svc.markRead(user, id); }
    mar(user) { return this.svc.markAllRead(user); }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(''),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "unread", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "mr", null);
__decorate([
    (0, common_1.Post)('mark-all-read'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "mar", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [DoctorsService])
], NotificationsController);
let DoctorsModule = class DoctorsModule {
};
exports.DoctorsModule = DoctorsModule;
exports.DoctorsModule = DoctorsModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: 'Doctor', schema: doctors_schemas_1.DoctorSchema },
                { name: 'DoctorAppointment', schema: doctors_schemas_1.DoctorAppointmentSchema },
                { name: 'DoctorChatMessage', schema: doctors_schemas_1.DoctorChatMessageSchema },
                { name: 'ConsultationNote', schema: doctors_schemas_1.ConsultationNoteSchema },
                { name: 'NotificationItem', schema: doctors_schemas_1.NotificationItemSchema },
            ])],
        controllers: [DoctorsController, NotificationsController],
        providers: [DoctorsService],
        exports: [DoctorsService],
    })
], DoctorsModule);
//# sourceMappingURL=doctors.module.js.map