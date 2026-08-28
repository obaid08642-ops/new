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
exports.HomeCareSvc = void 0;
const common_1 = require("@nestjs/common");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const event_emitter_1 = require("@nestjs/event-emitter");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const homecareservice_repository_1 = require("./repositories/homecareservice.repository");
const homecarebooking_repository_1 = require("./repositories/homecarebooking.repository");
const nursingvisitreport_repository_1 = require("./repositories/nursingvisitreport.repository");
const careplan_repository_1 = require("./repositories/careplan.repository");
const medicalsupplyrequest_repository_1 = require("./repositories/medicalsupplyrequest.repository");
let HomeCareSvc = class HomeCareSvc {
    constructor(svcModel, bkgModel, reportModel, carePlanModel, supplyModel, events, engine) {
        this.svcModel = svcModel;
        this.bkgModel = bkgModel;
        this.reportModel = reportModel;
        this.carePlanModel = carePlanModel;
        this.supplyModel = supplyModel;
        this.events = events;
        this.engine = engine;
    }
    async list(opts) {
        const q = { active: true };
        if (opts.category && opts.category !== 'all')
            q.category = opts.category;
        if (opts.duration && opts.duration !== 'all')
            q.duration = opts.duration;
        if (opts.search) {
            const re = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            q.$or = [{ name_ar: re }, { name_en: re }, { tags: re }];
        }
        return this.svcModel.find(q, { _id: 0, __v: 0 }).sort({ popularity: -1, name_ar: 1 }).limit(120);
    }
    async categoryCounts() {
        return this.svcModel.aggregate([
            { $match: { active: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $project: { _id: 0, slug: '$_id', count: 1 } },
            { $sort: { count: -1 } },
        ]);
    }
    async getById(id) {
        const s = await this.svcModel.findOne({ id }, { _id: 0, __v: 0 });
        if (!s)
            throw new common_1.NotFoundException();
        return s;
    }
    async book(user, data) {
        if (!data.service_id)
            throw new common_1.BadRequestException('service_id required');
        if (!data.scheduled_at)
            throw new common_1.BadRequestException('scheduled_at required');
        const svc = await this.svcModel.findOne({ id: data.service_id });
        if (!svc)
            throw new common_1.NotFoundException('service');
        const dupe = await this.bkgModel.findOne({
            patient_id: user.id,
            service_id: data.service_id,
            createdAt: { $gte: new Date(Date.now() - 3 * 60_000) },
            state: { $nin: ['CANCELLED', home_care_schema_1.NursingBookingState.COMPLETED] },
        }).lean();
        if (dupe)
            return dupe;
        const sessions = Math.max(1, parseInt(data.sessions_count || 1, 10));
        const total = svc.price * sessions;
        const booking = await this.bkgModel.create({
            patient_id: user.id,
            patient_name: data.contact?.name || user.full_name,
            patient_phone: data.contact?.phone || user.phone,
            service_id: svc.id,
            service_name_ar: svc.name_ar,
            service_name_en: svc.name_en,
            duration: svc.duration,
            total,
            address: data.address,
            scheduled_at: new Date(data.scheduled_at),
            state: home_care_schema_1.NursingBookingState.NEW_REQUEST,
            state_history: [{ from: '', to: home_care_schema_1.NursingBookingState.NEW_REQUEST, by_user_id: user.id, at: new Date() }],
            notes: data.notes,
            payment_method: data.payment_method || 'cash',
            sessions_count: sessions,
        });
        this.events.emit('homecare.booking_created', { booking_id: booking.id, patient_id: user.id });
        await this.engine.announceCreated({ kind: 'nursing', entity_id: booking.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, meta: { service_id: svc.id, total, sessions } });
        return booking.toObject();
    }
    async mineFor(user) {
        return this.bkgModel.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(80);
    }
    async getBooking(id, user) {
        const b = await this.bkgModel.findOne({ id }, { _id: 0, __v: 0 });
        if (!b)
            throw new common_1.NotFoundException();
        if (b.patient_id !== user.id && user.role !== 'admin')
            throw new common_1.NotFoundException();
        return b;
    }
    async cancel(id, user) {
        const b = await this.bkgModel.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException();
        if (b.patient_id !== user.id && user.role !== 'admin')
            throw new common_1.NotFoundException();
        if ([home_care_schema_1.NursingBookingState.COMPLETED, home_care_schema_1.NursingBookingState.ESCALATED_EMERGENCY].includes(b.state))
            return b.toObject();
        return await this.engine.apply({
            kind: 'nursing', entity_id: b.id, from_domain: b.state, to_domain: 'CANCELLED',
            actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: 'user_cancelled',
            mutate: async () => {
                b.state_history.push({ from: b.state, to: 'CANCELLED', by_user_id: user.id, at: new Date() });
                b.state = 'CANCELLED';
                await b.save();
                this.events.emit('homecare.booking_cancelled', { booking_id: b.id });
                return b.toObject();
            },
        });
    }
    async transition(id, to, user, note) {
        const b = await this.bkgModel.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException();
        return await this.engine.apply({
            kind: 'nursing', entity_id: b.id, from_domain: b.state, to_domain: to,
            actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: note,
            mutate: async () => {
                b.state_history.push({ from: b.state, to, by_user_id: user.id, at: new Date(), note });
                b.state = to;
                await b.save();
                this.events.emit('homecare.booking_state_changed', { booking_id: b.id, state: to });
                return b.toObject();
            },
        });
    }
    async checkIn(user, bookingId, lat, lng) {
        if (!['admin', 'nurse', 'hospital'].includes(user.role))
            throw new common_1.ForbiddenException();
        const b = await this.bkgModel.findOne({ id: bookingId });
        if (!b)
            throw new common_1.NotFoundException('booking_not_found');
        await this.transition(bookingId, home_care_schema_1.HomeCareBookingState.IN_PROGRESS, user, 'check_in');
        const report = await this.reportModel.create({
            id: require('uuid').v4(),
            booking_id: bookingId,
            patient_id: b.patient_id,
            nurse_id: user.id,
            check_in_time: new Date(),
            gps_lat: lat,
            gps_lng: lng,
        });
        return report;
    }
    async submitReport(user, reportId, body) {
        if (!['admin', 'nurse', 'hospital'].includes(user.role))
            throw new common_1.ForbiddenException();
        const report = await this.reportModel.findOne({ id: reportId });
        if (!report)
            throw new common_1.NotFoundException('report_not_found');
        await this.reportModel.updateOne({ id: reportId }, {
            $set: {
                check_out_time: new Date(),
                completed_tasks: body.completed_tasks,
                vitals_logged: body.vitals_logged || {},
                notes: body.notes
            }
        });
        await this.transition(report.booking_id, home_care_schema_1.HomeCareBookingState.COMPLETED, user, 'visit_completed');
        return { ok: true };
    }
    async createCarePlan(user, patientId, body) {
        if (!['admin', 'nurse', 'doctor', 'hospital'].includes(user.role))
            throw new common_1.ForbiddenException();
        return this.carePlanModel.create({
            id: require('uuid').v4(),
            patient_id: patientId,
            doctor_id: user.role === 'doctor' ? user.id : undefined,
            nurse_id: user.role === 'nurse' ? user.id : undefined,
            title: body.title,
            description: body.description,
            tasks: body.tasks || [],
            status: 'active'
        });
    }
    async getCarePlans(patientId) {
        return this.carePlanModel.find({ patient_id: patientId }).sort({ createdAt: -1 }).lean();
    }
    async requestSupplies(user, visitReportId, items) {
        if (!['admin', 'nurse', 'hospital'].includes(user.role))
            throw new common_1.ForbiddenException();
        return this.supplyModel.create({
            id: require('uuid').v4(),
            visit_report_id: visitReportId,
            nurse_id: user.id,
            items: items.map(it => ({ ...it, status: 'pending' }))
        });
    }
};
exports.HomeCareSvc = HomeCareSvc;
exports.HomeCareSvc = HomeCareSvc = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('HomeCareServiceRepository')),
    __param(1, (0, common_1.Inject)('HomeCareBookingRepository')),
    __param(2, (0, common_1.Inject)('NursingVisitReportRepository')),
    __param(3, (0, common_1.Inject)('CarePlanRepository')),
    __param(4, (0, common_1.Inject)('MedicalSupplyRequestRepository')),
    __metadata("design:paramtypes", [homecareservice_repository_1.HomeCareServiceRepository,
        homecarebooking_repository_1.HomeCareBookingRepository,
        nursingvisitreport_repository_1.NursingVisitReportRepository,
        careplan_repository_1.CarePlanRepository,
        medicalsupplyrequest_repository_1.MedicalSupplyRequestRepository,
        event_emitter_1.EventEmitter2,
        workflow_engine_module_1.WorkflowEngineService])
], HomeCareSvc);
//# sourceMappingURL=home-care.service.js.map