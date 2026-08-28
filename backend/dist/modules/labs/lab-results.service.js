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
exports.LabResultsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const lab_schema_1 = require("../../schemas/lab.schema");
const event_emitter_1 = require("@nestjs/event-emitter");
const common_2 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth.guard");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const labresult_repository_1 = require("./repositories/labresult.repository");
const labbooking_repository_1 = require("./repositories/labbooking.repository");
let LabResultsService = class LabResultsService {
    constructor(results, conn, bookings, events, engine) {
        this.results = results;
        this.conn = conn;
        this.bookings = bookings;
        this.events = events;
        this.engine = engine;
    }
    flagFor(value, ref_low, ref_high) {
        if (typeof value !== 'number' || isNaN(value))
            return 'normal';
        if (ref_high !== undefined && value > ref_high * 1.5)
            return 'critical';
        if (ref_low !== undefined && value < ref_low * 0.5)
            return 'critical';
        if (ref_high !== undefined && value > ref_high)
            return 'high';
        if (ref_low !== undefined && value < ref_low)
            return 'low';
        return 'normal';
    }
    async create(user, body) {
        if (!body.booking_id)
            throw new common_1.BadRequestException('booking_id required');
        if (!body.type)
            throw new common_1.BadRequestException('type required');
        const b = await this.bookings.findOne({ id: body.booking_id });
        if (!b)
            throw new common_1.NotFoundException('booking');
        const effectiveRoles = (0, auth_guard_1.getEffectiveRoles)(user);
        if (!effectiveRoles.some(role => ['admin', 'lab', 'hospital'].includes(role)))
            throw new common_2.ForbiddenException('lab_provider_required');
        if (!effectiveRoles.includes('admin') && b.provider_account_id !== user.id)
            throw new common_2.ForbiddenException('lab_booking_not_owned');
        if (b.state !== lab_schema_1.LabBookingState.RESULT_UPLOADED)
            throw new common_1.BadRequestException(`invalid_transition_${b.state}_to_REPORTED`);
        let critical = false;
        const entries = (body.entries || []).map((e) => {
            const val = parseFloat(e.value);
            const flag = e.flag || this.flagFor(val, e.ref_low, e.ref_high);
            if (flag === 'critical')
                critical = true;
            return { ...e, value: e.value, flag };
        });
        return this.engine.apply({
            kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: lab_schema_1.LabBookingState.REPORTED,
            actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: 'lab_result_created',
            mutate: async () => {
                const r = await this.results.create({
                    booking_id: b.id, patient_id: b.patient_id, patient_name: b.patient_name,
                    service_id: b.items?.[0]?.service_id, service_name_ar: body.service_name_ar || b.items?.[0]?.name_ar || '',
                    service_name_en: body.service_name_en || b.items?.[0]?.name_en, type: body.type, source: 'labs', entries,
                    attachments: body.attachments || [], findings: body.findings, impression: body.impression,
                    recommendations: body.recommendations, notes: body.notes, reported_at: new Date(),
                    reported_by_id: user.id, reported_by_name: user.full_name, critical,
                });
                b.reports = [...(b.reports || []), { result_id: r.id, tracking_id: r.tracking_id, at: new Date() }];
                b.state_history.push({ from: b.state, to: lab_schema_1.LabBookingState.REPORTED, by_user_id: user.id, by_role: user.role, at: new Date() });
                b.state = lab_schema_1.LabBookingState.REPORTED;
                await b.save();
                this.events.emit('lab.result_ready', { result_id: r.id, patient_id: b.patient_id, critical, tracking_id: r.tracking_id });
                this.events.emit('lab.booking_state_changed', { booking_id: b.id, patient_id: b.patient_id, state: b.state, tracking_id: b.tracking_id });
                return r.toObject();
            },
        });
    }
    async mineFor(user) {
        const standalone = await this.results.find({ patient_id: user.id, source: { $ne: 'radiology' } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100);
        const embedded = await this.conn.collection('labbookings').aggregate([
            { $match: { patient_id: user.id, 'reports.0': { $exists: true } } },
            { $unwind: '$reports' },
            { $project: {
                    _id: 0,
                    id: '$reports.id',
                    booking_id: '$id',
                    patient_id: '$patient_id',
                    name: '$reports.name',
                    mime: '$reports.mime',
                    url: '$reports.url',
                    notes: '$reports.notes',
                    uploaded_at: '$reports.uploaded_at',
                    state: '$state',
                    source: { $literal: 'lab_booking' },
                    createdAt: '$reports.uploaded_at',
                } },
            { $sort: { createdAt: -1 } },
            { $limit: 100 },
        ]).toArray();
        return [...embedded, ...standalone].sort((a, b) => new Date(b.createdAt || b.uploaded_at).getTime() - new Date(a.createdAt || a.uploaded_at).getTime());
    }
    async byBooking(user, booking_id) {
        const list = await this.results.find({ booking_id, patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 });
        return list;
    }
    async one(user, id) {
        const r = await this.results.findOne({ id });
        if (r) {
            if (r.patient_id !== user.id && user.role !== 'admin')
                throw new common_1.NotFoundException();
            if (!r.viewed_by_patient && r.patient_id === user.id) {
                r.viewed_by_patient = true;
                r.patient_viewed_at = new Date();
                await r.save();
            }
            return r.toObject();
        }
        const bookingFilter = { 'reports.id': id };
        if (user.role !== 'admin')
            bookingFilter.patient_id = user.id;
        const booking = await this.conn.collection('labbookings').findOne(bookingFilter, {
            projection: { _id: 0, id: 1, patient_id: 1, state: 1, reports: 1 },
        });
        const report = booking?.reports?.find((entry) => entry?.id === id);
        if (!booking || !report)
            throw new common_1.NotFoundException();
        return {
            id: report.id,
            booking_id: booking.id,
            patient_id: booking.patient_id,
            name: report.name,
            mime: report.mime,
            url: report.url,
            notes: report.notes,
            uploaded_at: report.uploaded_at,
            state: booking.state,
            source: 'lab_booking',
        };
    }
};
exports.LabResultsService = LabResultsService;
exports.LabResultsService = LabResultsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('LabResultRepository')),
    __param(1, (0, mongoose_1.InjectConnection)()),
    __param(2, (0, common_1.Inject)('LabBookingRepository')),
    __metadata("design:paramtypes", [labresult_repository_1.LabResultRepository,
        mongoose_2.Connection,
        labbooking_repository_1.LabBookingRepository,
        event_emitter_1.EventEmitter2,
        workflow_engine_module_1.WorkflowEngineService])
], LabResultsService);
//# sourceMappingURL=lab-results.service.js.map