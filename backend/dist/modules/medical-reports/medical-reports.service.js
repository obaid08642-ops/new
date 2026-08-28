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
exports.MedicalReportsService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const medical_report_schema_1 = require("../../schemas/medical-report.schema");
const medicalreport_repository_1 = require("./repositories/medicalreport.repository");
let MedicalReportsService = class MedicalReportsService {
    constructor(model, events) {
        this.model = model;
        this.events = events;
    }
    async list(user, opts) {
        const filter = { patient_id: user.id };
        if (opts.type)
            filter.report_type = opts.type;
        if (opts.q) {
            const re = new RegExp(opts.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ title_ar: re }, { title_en: re }, { summary: re }, { diagnosis: re }];
        }
        return this.model.find(filter, { _id: 0, __v: 0, body: 0 }).sort({ issued_at: -1, createdAt: -1 }).limit(Math.min(opts.limit || 80, 200));
    }
    async one(user, id) {
        const r = await this.model.findOne({ id });
        if (!r)
            throw new common_1.NotFoundException();
        if (r.patient_id !== user.id && user.role !== 'admin')
            throw new common_1.NotFoundException();
        if (!r.viewed_by_patient && r.patient_id === user.id) {
            r.viewed_by_patient = true;
            r.patient_viewed_at = new Date();
            await r.save();
        }
        return r.toObject();
    }
    async create(user, body) {
        if (!['admin', 'doctor', 'hospital', 'radiology', 'lab'].includes(user.role))
            throw new common_1.ForbiddenException('provider only');
        if (!body.patient_id)
            throw new common_1.BadRequestException('patient_id required');
        if (!body.title_ar)
            throw new common_1.BadRequestException('title_ar required');
        const r = await this.model.create({
            patient_id: body.patient_id,
            patient_name: body.patient_name,
            title_ar: body.title_ar,
            title_en: body.title_en,
            report_type: body.report_type || medical_report_schema_1.MedicalReportType.CLINIC_NOTE,
            summary: body.summary,
            body: body.body,
            diagnosis: body.diagnosis,
            recommendations: body.recommendations,
            critical: !!body.critical,
            appointment_id: body.appointment_id,
            prescription_id: body.prescription_id,
            lab_booking_id: body.lab_booking_id,
            radiology_booking_id: body.radiology_booking_id,
            doctor_id: body.doctor_id || (user.role === 'doctor' ? user.id : undefined),
            doctor_name: body.doctor_name || (user.role === 'doctor' ? user.full_name : undefined),
            facility_id: body.facility_id,
            facility_name: body.facility_name,
            attachments: body.attachments || [],
            issued_at: body.issued_at ? new Date(body.issued_at) : new Date(),
        });
        this.events.emit('medical_report.created', { id: r.id, patient_id: r.patient_id, critical: r.critical, tracking_id: r.tracking_id });
        return r.toObject();
    }
    async byTracking(tracking_id, user) {
        const r = await this.model.findOne({ tracking_id }, { _id: 0, __v: 0 });
        if (!r)
            throw new common_1.NotFoundException();
        if (r.patient_id !== user.id && user.role !== 'admin')
            throw new common_1.NotFoundException();
        return r;
    }
};
exports.MedicalReportsService = MedicalReportsService;
exports.MedicalReportsService = MedicalReportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('MedicalReportRepository')),
    __metadata("design:paramtypes", [medicalreport_repository_1.MedicalReportRepository,
        event_emitter_1.EventEmitter2])
], MedicalReportsService);
//# sourceMappingURL=medical-reports.service.js.map