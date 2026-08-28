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
exports.SupportService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const support_schema_1 = require("../../schemas/support.schema");
const supportrequest_repository_1 = require("./repositories/supportrequest.repository");
const patientsettings_repository_1 = require("./repositories/patientsettings.repository");
let SupportService = class SupportService {
    constructor(req, settings, conn) {
        this.req = req;
        this.settings = settings;
        this.conn = conn;
    }
    async create(user, body) {
        if (!body.subject || !body.message)
            throw new common_1.BadRequestException('subject and message required');
        const r = await this.req.create({
            user_id: user.id,
            user_name: user.full_name,
            user_phone: user.phone,
            category: body.category || 'GENERAL',
            subject: body.subject.trim(),
            message: body.message.trim(),
            attachments: body.attachments || [],
            source_role: user.role || 'patient',
            priority: body.priority || 'medium',
            thread: [{ by: user.id, role: user.role || 'patient', message: body.message.trim(), at: new Date() }],
        });
        return r.toObject();
    }
    async mine(user) {
        return this.req.find({ user_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(80);
    }
    async getOne(user, id) {
        const r = await this.req.findOne({ id }, { _id: 0, __v: 0 });
        if (!r)
            throw new common_1.NotFoundException();
        if (r.user_id !== user.id && user.role !== 'admin')
            throw new common_1.NotFoundException();
        return r;
    }
    async reply(user, id, message) {
        if (!message?.trim())
            throw new common_1.BadRequestException('message required');
        const r = await this.req.findOne({ id });
        if (!r)
            throw new common_1.NotFoundException();
        if (r.user_id !== user.id && user.role !== 'admin')
            throw new common_1.NotFoundException();
        r.thread.push({ by: user.id, role: user.role || 'patient', message: message.trim(), at: new Date() });
        await r.save();
        return r.toObject();
    }
    async adminList(status) {
        const q = {};
        if (status)
            q.status = status;
        return this.req.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
    }
    async adminUpdateStatus(id, status, assigned_to) {
        if (!Object.values(support_schema_1.SupportStatus).includes(status))
            throw new common_1.BadRequestException('bad status');
        const r = await this.req.findOne({ id });
        if (!r)
            throw new common_1.NotFoundException();
        r.status = status;
        if (assigned_to !== undefined)
            r.assigned_to = assigned_to;
        if (status === support_schema_1.SupportStatus.RESOLVED)
            r.resolved_at = new Date();
        await r.save();
        return r.toObject();
    }
    async listTickets(user_id) {
        return this.req.find({ patient_id: user_id }).sort({ createdAt: -1 });
    }
    async getSettings(user) {
        let s = await this.settings.findOne({ user_id: user.id }, { _id: 0, __v: 0 });
        if (!s) {
            s = await this.settings.create({ user_id: user.id });
        }
        return s;
    }
    async updateSettings(user, body) {
        const allowed = ['language', 'theme', 'calendar', 'notifications_enabled', 'notif_reminders', 'notif_orders', 'notif_appointments', 'notif_lab_results', 'expo_push_token'];
        const $set = {};
        for (const k of allowed)
            if (body[k] !== undefined)
                $set[k] = body[k];
        const s = await this.settings.findOneAndUpdate({ user_id: user.id }, { $set }, { new: true, upsert: true });
        return s.toObject();
    }
    async getFaqs() {
        return [
            { id: '1', question: 'كيف أحجز موعد؟', answer: 'يمكنك الحجز من خلال قسم العيادات' },
            { id: '2', question: 'هل التأمين مغطى؟', answer: 'نعم، ندعم معظم شركات التأمين' }
        ];
    }
    async submitFeedback(user_id, body) {
        return { success: true, message: 'شكرًا لملاحظاتك!' };
    }
};
exports.SupportService = SupportService;
exports.SupportService = SupportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('SupportRequestRepository')),
    __param(1, (0, common_1.Inject)('PatientSettingsRepository')),
    __param(2, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [supportrequest_repository_1.SupportRequestRepository,
        patientsettings_repository_1.PatientSettingsRepository,
        mongoose_2.Connection])
], SupportService);
//# sourceMappingURL=support.service.js.map