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
exports.CustomServicesService = void 0;
const common_1 = require("@nestjs/common");
const custom_service_schema_1 = require("../../schemas/custom-service.schema");
const event_emitter_1 = require("@nestjs/event-emitter");
const customservicerequest_repository_1 = require("./repositories/customservicerequest.repository");
const enums_1 = require("../../common/enums");
let CustomServicesService = class CustomServicesService {
    constructor(model, events) {
        this.model = model;
        this.events = events;
    }
    async create(user, body) {
        if (!body.kind || !Object.values(custom_service_schema_1.CustomServiceKind).includes(body.kind))
            throw new common_1.BadRequestException('invalid kind');
        if (!body.name_ar?.trim())
            throw new common_1.BadRequestException('name_ar required');
        const r = await this.model.create({
            patient_id: user.id,
            patient_name: user.full_name,
            patient_phone: user.phone,
            kind: body.kind,
            name_ar: body.name_ar.trim(),
            name_en: body.name_en?.trim(),
            doctor_notes: body.doctor_notes,
            doctor_name: body.doctor_name,
            prescription_image: body.prescription_image,
            attachments: body.attachments || [],
            priority: body.priority || 'medium',
            status_history: [{ from: '', to: custom_service_schema_1.CustomServiceStatus.PENDING, by_user_id: user.id, by_role: user.role || 'patient', at: new Date() }],
        });
        this.events.emit('custom_service.created', { id: r.id, patient_id: user.id, kind: r.kind, name_ar: r.name_ar });
        return r.toObject();
    }
    async mine(user, kind) {
        const q = { patient_id: user.id };
        if (kind)
            q.kind = kind;
        return this.model.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(80);
    }
    async one(user, id) {
        const r = await this.model.findOne({ id }, { _id: 0, __v: 0 });
        if (!r)
            throw new common_1.NotFoundException();
        if (r.patient_id !== user.id && user.role !== 'admin' && !(0, enums_1.isProviderRole)(user.role))
            throw new common_1.NotFoundException();
        return r;
    }
    async adminList(kind, status) {
        const q = {};
        if (kind)
            q.kind = kind;
        if (status)
            q.status = status;
        return this.model.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
    }
    async updateStatus(user, id, status, note) {
        if (!Object.values(custom_service_schema_1.CustomServiceStatus).includes(status))
            throw new common_1.BadRequestException('bad status');
        const r = await this.model.findOne({ id });
        if (!r)
            throw new common_1.NotFoundException();
        r.status_history.push({ from: r.status, to: status, by_user_id: user.id, by_role: user.role, at: new Date(), note });
        r.status = status;
        if (status === custom_service_schema_1.CustomServiceStatus.PROVIDED || status === custom_service_schema_1.CustomServiceStatus.REJECTED || status === custom_service_schema_1.CustomServiceStatus.ADDED_TO_CATALOG) {
            r.resolved_at = new Date();
        }
        if (note)
            r.admin_notes = note;
        await r.save();
        this.events.emit('custom_service.status_changed', { id: r.id, status });
        return r.toObject();
    }
};
exports.CustomServicesService = CustomServicesService;
exports.CustomServicesService = CustomServicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('CustomServiceRequestRepository')),
    __metadata("design:paramtypes", [customservicerequest_repository_1.CustomServiceRequestRepository,
        event_emitter_1.EventEmitter2])
], CustomServicesService);
//# sourceMappingURL=custom-services.service.js.map