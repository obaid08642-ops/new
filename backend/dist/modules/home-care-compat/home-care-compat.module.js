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
exports.HomeCareCompatModule = exports.ChatAliasController = exports.NursingOpsController = exports.HomeCareCompatController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const uuid_1 = require("uuid");
const auth_guard_1 = require("../../common/auth.guard");
const chat_module_1 = require("../chat/chat.module");
const chat_service_1 = require("../chat/chat.service");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const ACTIVE_STATES = ['NEW_REQUEST', 'PROVIDER_ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'CARE_STARTED'];
let HomeCareCompatController = class HomeCareCompatController {
    constructor(bookings, services, profiles, carePlans, emitter) {
        this.bookings = bookings;
        this.services = services;
        this.profiles = profiles;
        this.carePlans = carePlans;
        this.emitter = emitter;
    }
    servicesList(q) {
        const filter = { active: true };
        if (q?.category)
            filter.category = q.category;
        return this.services.find(filter, { _id: 0, __v: 0 }).lean();
    }
    async serviceOne(id) {
        const svc = await this.services.findOne({ id, active: true }, { _id: 0, __v: 0 }).lean();
        if (!svc)
            throw new common_1.NotFoundException('service not found');
        return svc;
    }
    async providers(q) {
        const filter = { provider_type: 'nursing', active: true, approval_status: 'approved' };
        if (q?.city)
            filter['address.city'] = q.city;
        return this.profiles.find(filter, {
            _id: 0, id: 1, full_name: 1, provider_type: 1, rating_avg: 1, rating_count: 1, address: 1, specialties: 1, years_experience: 1,
        }).limit(50).lean();
    }
    async provider(id) {
        const p = await this.profiles.findOne({ id }, { _id: 0, __v: 0 }).lean();
        if (!p)
            throw new common_1.NotFoundException('provider not found');
        return p;
    }
    isAdmin(u) { return u?.role === 'admin' || u?.role === 'super_admin'; }
    isNursingProvider(u) {
        return ['nurse', 'nursing', 'provider'].includes(String(u?.role || '').toLowerCase())
            && ['nursing', 'nurse', 'provider'].includes(String(u?.provider_type || u?.providerType || u?.role || '').toLowerCase());
    }
    async getBookingForAccess(u, id, allowUnassignedProvider = false) {
        const b = await this.bookings.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException('booking not found');
        if (this.isAdmin(u))
            return b;
        if (u?.role === 'patient' && b.patient_id === u.id)
            return b;
        if (this.isNursingProvider(u) && (b.provider_id === u.id || (allowUnassignedProvider && !b.provider_id)))
            return b;
        throw new common_1.ForbiddenException('booking_access_denied');
    }
    async createBooking(u, body) {
        if (u?.role !== 'patient')
            throw new common_1.ForbiddenException('patient_only');
        if (!body?.service_id)
            throw new common_1.BadRequestException('service_id is required');
        if (!body?.scheduled_at)
            throw new common_1.BadRequestException('scheduled_at is required');
        const svc = await this.services.findOne({ id: body.service_id, active: true }).lean();
        if (!svc)
            throw new common_1.NotFoundException('service not found');
        const doc = await this.bookings.create({
            patient_id: u.id,
            service_id: svc?.id || body.service_id,
            service_name_ar: svc?.name_ar || body.service_name_ar,
            duration: svc.duration || 'hour',
            total: svc.price,
            total_price: svc.price,
            scheduled_at: new Date(body.scheduled_at),
            address: body.address,
            payment_method: body.payment_method,
            provider_id: undefined,
            state: 'NEW_REQUEST',
            state_history: [{ state: 'NEW_REQUEST', at: new Date(), by: u.id }],
        });
        try {
            this.emitter?.emit('homecare.booking_created', { booking_id: doc.id, patient_id: u.id });
        }
        catch { }
        return doc.toObject();
    }
    myBookings(u, q) {
        const filter = u.role === 'patient' ? { patient_id: u.id } : { provider_id: u.id };
        return this.bookings.find(filter, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
    }
    nursingQueue(u, q) {
        if (!this.isAdmin(u) && !this.isNursingProvider(u))
            throw new common_1.ForbiddenException('provider_role_required');
        const filter = {};
        const status = q?.status || 'active';
        if (status === 'active')
            filter.state = { $in: ACTIVE_STATES };
        else if (status === 'incoming')
            filter.state = 'NEW_REQUEST';
        else if (status === 'completed')
            filter.state = { $in: ['COMPLETED', 'CANCELLED'] };
        filter.$or = [{ provider_id: u.id }, { provider_id: { $exists: false } }, { provider_id: null }];
        return this.bookings.find(filter, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
    }
    async transition(u, id, newState, extra = {}) {
        const allowUnassigned = newState === 'PROVIDER_ASSIGNED' || newState === 'CANCELLED';
        const b = await this.getBookingForAccess(u, id, allowUnassigned);
        if (u?.role === 'patient')
            throw new common_1.ForbiddenException('provider_transition_required');
        if (!this.isAdmin(u) && !this.isNursingProvider(u))
            throw new common_1.ForbiddenException('provider_role_required');
        const allowed = {
            PROVIDER_ASSIGNED: ['NEW_REQUEST'],
            ARRIVED: ['PROVIDER_ASSIGNED', 'ACCEPTED', 'EN_ROUTE'],
            CARE_IN_PROGRESS: ['ARRIVED'],
            COMPLETED: ['CARE_IN_PROGRESS', 'ARRIVED'],
            CANCELLED: ['NEW_REQUEST', 'PROVIDER_ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'CARE_IN_PROGRESS'],
        };
        if (!this.isAdmin(u) && allowed[newState] && !allowed[newState].includes(String(b.state))) {
            throw new common_1.BadRequestException('invalid_transition');
        }
        b.state = newState;
        b.state_history = [...(b.state_history || []), { state: newState, at: new Date(), by: u.id, ...extra.meta }];
        Object.assign(b, extra.fields || {});
        b.markModified('state_history');
        await b.save();
        try {
            this.emitter?.emit('homecare.booking_state_changed', { booking_id: id, patient_id: b.patient_id, state: newState, provider_id: b.provider_id });
        }
        catch { }
        return { ok: true, id, state: newState };
    }
    respond(u, id, body) {
        const accept = body?.accept === true || body?.action === 'accept';
        return this.transition(u, id, accept ? 'PROVIDER_ASSIGNED' : 'CANCELLED', {
            fields: accept ? { provider_id: u.id } : {},
            meta: { reason: body?.reason },
        });
    }
    async assign(u, id, body) {
        if (!this.isAdmin(u))
            throw new common_1.ForbiddenException('admin_only');
        if (!body?.provider_id)
            throw new common_1.BadRequestException('provider_id is required');
        await this.getBookingForAccess(u, id);
        return this.transition(u, id, 'PROVIDER_ASSIGNED', { fields: { provider_id: body.provider_id, provider_name: body.provider_name } });
    }
    checkIn(u, id, body) {
        return this.transition(u, id, 'ARRIVED', { fields: { 'timers.arrived_at': new Date(), checklist: body?.checklist } });
    }
    async gps(u, id, body) {
        if (typeof body?.lat !== 'number' || typeof body?.lng !== 'number')
            throw new common_1.BadRequestException('lat/lng required');
        const b = await this.getBookingForAccess(u, id);
        if (!this.isAdmin(u) && (u?.role === 'patient' || !this.isNursingProvider(u) || b.provider_id !== u.id))
            throw new common_1.ForbiddenException('assigned_provider_required');
        await this.bookings.updateOne({ id, ...(this.isAdmin(u) ? {} : { provider_id: u.id }) }, { $set: { 'gps_tracking.current_lat': body.lat, 'gps_tracking.current_lng': body.lng, 'gps_tracking.last_updated': new Date() } });
        return { ok: true };
    }
    visitReport(u, id, body) {
        return this.transition(u, id, body?.complete ? 'COMPLETED' : 'CARE_IN_PROGRESS', {
            fields: {
                vitals: body?.vitals, clinical_notes: body?.clinical_notes,
                procedure_notes: body?.procedure_notes, medication_administered: body?.medication_administered,
                consumables_used: body?.consumables_used, recommendations: body?.recommendations,
                follow_up_instructions: body?.follow_up_instructions,
                ...(body?.complete ? { 'timers.completed_at': new Date() } : { 'timers.care_started_at': new Date() }),
            },
        });
    }
    async listCarePlans(u, patientId) {
        if (this.isAdmin(u) || (u?.role === 'patient' && u.id === patientId))
            return this.carePlans.find({ patient_id: patientId }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
        if (this.isNursingProvider(u))
            return this.carePlans.find({ patient_id: patientId, $or: [{ nurse_id: u.id }, { doctor_id: u.id }] }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
        throw new common_1.ForbiddenException('care_plan_access_denied');
    }
    async createCarePlan(u, patientId, body) {
        if (!this.isAdmin(u) && !this.isNursingProvider(u) && !['doctor', 'hospital'].includes(String(u?.role || '').toLowerCase()))
            throw new common_1.ForbiddenException('role_not_allowed');
        if (!this.isAdmin(u) && !['doctor', 'hospital'].includes(String(u?.role || '').toLowerCase())) {
            const assigned = await this.bookings.findOne({ patient_id: patientId, provider_id: u.id });
            if (!assigned)
                throw new common_1.ForbiddenException('patient_not_assigned');
        }
        if (!body?.title || typeof body.title !== 'string')
            throw new common_1.BadRequestException('title is required');
        const tasks = Array.isArray(body?.tasks) ? body.tasks.filter((t) => typeof t === 'string' && t.trim()).slice(0, 50) : [];
        return this.carePlans.create({
            id: (0, uuid_1.v4)(),
            patient_id: patientId,
            doctor_id: u.role === 'doctor' ? u.id : undefined,
            nurse_id: u.role === 'nurse' ? u.id : undefined,
            title: String(body.title).slice(0, 200),
            description: body?.description ? String(body.description).slice(0, 2000) : undefined,
            tasks: tasks.map((t) => t.slice(0, 300)),
            status: 'active',
        });
    }
    async setAvailability(u, body) {
        if (!this.isAdmin(u) && !this.isNursingProvider(u))
            throw new common_1.ForbiddenException('provider_role_required');
        await this.profiles.updateOne({ id: u.id, ...(this.isAdmin(u) ? {} : { provider_type: { $in: ['nursing', 'nurse'] } }) }, { $set: { 'availability.online': !!body?.online, 'availability.available_now': !!body?.available_now, 'availability.updated_at': new Date() } });
        return { ok: true };
    }
    async inventoryRequest(u, body) {
        if (!Array.isArray(body?.items) || !body.items.length)
            throw new common_1.BadRequestException('items required');
        if (!body?.booking_id)
            throw new common_1.BadRequestException('booking_id is required');
        const b = await this.getBookingForAccess(u, body.booking_id);
        if (!this.isAdmin(u) && (u?.role === 'patient' || !this.isNursingProvider(u) || b.provider_id !== u.id))
            throw new common_1.ForbiddenException('assigned_provider_required');
        await this.bookings.updateOne({ id: body.booking_id, ...(this.isAdmin(u) ? {} : { provider_id: u.id }) }, { $push: { supply_requests: { id: (0, uuid_1.v4)(), items: body.items, at: new Date(), by: u.id, state: 'requested' } } });
        return { ok: true, state: 'requested' };
    }
};
exports.HomeCareCompatController = HomeCareCompatController;
__decorate([
    (0, common_1.Get)('services'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HomeCareCompatController.prototype, "servicesList", null);
__decorate([
    (0, common_1.Get)('services/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HomeCareCompatController.prototype, "serviceOne", null);
__decorate([
    (0, common_1.Get)('providers'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HomeCareCompatController.prototype, "providers", null);
__decorate([
    (0, common_1.Get)('providers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HomeCareCompatController.prototype, "provider", null);
__decorate([
    (0, common_1.Post)('bookings'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HomeCareCompatController.prototype, "createBooking", null);
__decorate([
    (0, common_1.Get)('bookings/my'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], HomeCareCompatController.prototype, "myBookings", null);
__decorate([
    (0, common_1.Get)('bookings/nursing/all'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], HomeCareCompatController.prototype, "nursingQueue", null);
__decorate([
    (0, common_1.Post)('bookings/:id/respond'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HomeCareCompatController.prototype, "respond", null);
__decorate([
    (0, common_1.Post)('bookings/:id/assign'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], HomeCareCompatController.prototype, "assign", null);
__decorate([
    (0, common_1.Post)('bookings/:id/check-in'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HomeCareCompatController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Post)('bookings/:id/gps'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], HomeCareCompatController.prototype, "gps", null);
__decorate([
    (0, common_1.Post)('bookings/:id/visit-report'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HomeCareCompatController.prototype, "visitReport", null);
__decorate([
    (0, common_1.Get)('care-plans/:patientId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('patientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], HomeCareCompatController.prototype, "listCarePlans", null);
__decorate([
    (0, common_1.Post)('care-plans/:patientId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('patientId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], HomeCareCompatController.prototype, "createCarePlan", null);
__decorate([
    (0, common_1.Post)('provider/availability'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HomeCareCompatController.prototype, "setAvailability", null);
__decorate([
    (0, common_1.Post)('inventory/request'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HomeCareCompatController.prototype, "inventoryRequest", null);
exports.HomeCareCompatController = HomeCareCompatController = __decorate([
    (0, common_1.Controller)('home-care'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(1, (0, mongoose_1.InjectModel)('HomeCareService')),
    __param(2, (0, mongoose_1.InjectModel)('ProviderProfile')),
    __param(3, (0, mongoose_1.InjectModel)('CarePlan')),
    __param(4, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        event_emitter_1.EventEmitter2])
], HomeCareCompatController);
const NURSING_CHECKLISTS = {
    default: [
        { key: 'verify_identity', title_ar: 'التحقق من هوية المريض', required: true },
        { key: 'vitals_baseline', title_ar: 'قياس العلامات الحيوية الأساسية', required: true },
        { key: 'meds_check', title_ar: 'مراجعة الأدوية والحساسية', required: true },
        { key: 'consent', title_ar: 'أخذ الموافقة المستنيرة', required: true },
        { key: 'sterile_field', title_ar: 'تجهيز حقل معقم', required: false },
        { key: 'documentation', title_ar: 'توثيق الإجراء في التقرير', required: true },
    ],
    wound: [
        { key: 'wound_assessment', title_ar: 'تقييم الجرح (حجم/عمق/إفرازات)', required: true },
        { key: 'sterile_technique', title_ar: 'تقنية التعقيم الكاملة', required: true },
        { key: 'dressing_change', title_ar: 'تغيير الضماد وفق البروتوكول', required: true },
        { key: 'photo_documentation', title_ar: 'توثيق مصور بموافقة المريض', required: false },
    ],
    iv: [
        { key: 'vein_assessment', title_ar: 'تقييم الوريد المناسب', required: true },
        { key: 'line_check', title_ar: 'فحص الخط الوريدي وسلامته', required: true },
        { key: 'infusion_monitoring', title_ar: 'مراقبة التسريب والمضاعفات', required: true },
    ],
};
const NURSING_SUPPLIES = [
    { id: 'sup-001', name_ar: 'قفازات معقمة (علبة)', category: 'consumable', unit: 'علبة' },
    { id: 'sup-002', name_ar: 'شاش معقم', category: 'consumable', unit: 'عبوة' },
    { id: 'sup-003', name_ar: 'محلول ملحي 0.9%', category: 'consumable', unit: 'زجاجة' },
    { id: 'sup-004', name_ar: 'قسطرة وريدية 20G', category: 'consumable', unit: 'قطعة' },
    { id: 'sup-005', name_ar: 'ضمادات لاصقة متنوعة', category: 'consumable', unit: 'عبوة' },
    { id: 'sup-006', name_ar: 'مطهر كحولي 70%', category: 'consumable', unit: 'زجاجة' },
    { id: 'sup-007', name_ar: 'أنبوب سحب عينات', category: 'lab', unit: 'قطعة' },
    { id: 'sup-008', name_ar: 'جهاز قياس سكر + شرائح', category: 'device', unit: 'عدة' },
    { id: 'sup-009', name_ar: 'حاقنات 3ml/5ml', category: 'consumable', unit: 'علبة' },
    { id: 'sup-010', name_ar: 'أكياس نفايات طبية', category: 'consumable', unit: 'رول' },
];
let NursingOpsController = class NursingOpsController {
    checklist(category) {
        return { category: category || 'default', items: NURSING_CHECKLISTS[category || 'default'] || NURSING_CHECKLISTS.default };
    }
    supplies() { return { items: NURSING_SUPPLIES }; }
};
exports.NursingOpsController = NursingOpsController;
__decorate([
    (0, common_1.Get)('checklist'),
    __param(0, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NursingOpsController.prototype, "checklist", null);
__decorate([
    (0, common_1.Get)('supplies'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NursingOpsController.prototype, "supplies", null);
exports.NursingOpsController = NursingOpsController = __decorate([
    (0, common_1.Controller)('provider/nursing'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard)
], NursingOpsController);
let ChatAliasController = class ChatAliasController {
    constructor(chat) {
        this.chat = chat;
    }
    providerThreads(u, q) {
        return this.chat.myThreads(u.id, parseInt(q?.page || '1', 10) || 1, parseInt(q?.limit || '30', 10) || 30);
    }
    channels(u, q) {
        return this.chat.myThreads(u.id, 1, 50);
    }
    getMessages(u, id, q) {
        return this.chat.getMessages(id, u.id, { before: q?.before, limit: parseInt(q?.limit || '50', 10) || 50 });
    }
    postMessage(u, id, body) {
        return this.chat.sendMessage(id, u.id, u.role || 'user', { type: 'text', body: body?.content || body?.text || body?.body });
    }
    postLegacy(u, threadId, body) {
        return this.chat.sendMessage(threadId, u.id, u.role || 'user', { type: 'text', body: body?.text || body?.content });
    }
    providerSend(u, body) {
        const threadId = body?.thread_id || body?.threadId;
        if (!threadId)
            throw new common_1.BadRequestException('thread_id is required');
        return this.chat.sendMessage(threadId, u.id, u.role || 'provider', { type: 'text', body: body?.text || body?.content });
    }
};
exports.ChatAliasController = ChatAliasController;
__decorate([
    (0, common_1.Get)('chats/provider'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatAliasController.prototype, "providerThreads", null);
__decorate([
    (0, common_1.Get)('chat/channels'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatAliasController.prototype, "channels", null);
__decorate([
    (0, common_1.Get)('chats/:id/messages'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ChatAliasController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('chats/:id/messages'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ChatAliasController.prototype, "postMessage", null);
__decorate([
    (0, common_1.Post)('chat/messages/:threadId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('threadId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ChatAliasController.prototype, "postLegacy", null);
__decorate([
    (0, common_1.Post)('provider/chat/send'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatAliasController.prototype, "providerSend", null);
exports.ChatAliasController = ChatAliasController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatAliasController);
let HomeCareCompatModule = class HomeCareCompatModule {
};
exports.HomeCareCompatModule = HomeCareCompatModule;
exports.HomeCareCompatModule = HomeCareCompatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            chat_module_1.ChatModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'HomeCareBooking', schema: home_care_schema_1.HomeCareBookingSchema },
                { name: 'HomeCareService', schema: home_care_schema_1.HomeCareServiceSchema },
                { name: 'ProviderProfile', schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: 'CarePlan', schema: home_care_schema_1.CarePlanSchema },
            ]),
        ],
        controllers: [HomeCareCompatController, NursingOpsController, ChatAliasController],
    })
], HomeCareCompatModule);
//# sourceMappingURL=home-care-compat.module.js.map