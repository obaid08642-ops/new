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
exports.HomeCareContractController = exports.NursingController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const common_2 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const uuid_1 = require("uuid");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
let NursingController = class NursingController {
    constructor(bkgModel, serviceModel, nurseModel, conn, events, engine) {
        this.bkgModel = bkgModel;
        this.serviceModel = serviceModel;
        this.nurseModel = nurseModel;
        this.conn = conn;
        this.events = events;
        this.engine = engine;
    }
    isAdmin(user) {
        return user?.role === 'admin' || user?.role === 'super_admin';
    }
    isNursingProvider(user) {
        return ['nurse', 'nursing', 'home_care', 'hospital'].includes(String(user?.role || '').toLowerCase())
            || ['nurse', 'nursing', 'home_care', 'hospital'].includes(String(user?.provider_type || user?.providerType || '').toLowerCase());
    }
    async findVisit(id) {
        const b = await this.bkgModel.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException('Visit not found');
        return b;
    }
    assertReadAccess(b, user) {
        if (this.isAdmin(user))
            return;
        if (b.patient_id === user?.id)
            return;
        if (this.isNursingProvider(user) && b.provider_id === user?.id)
            return;
        throw new common_2.ForbiddenException('visit access denied');
    }
    assertProviderMutation(b, user, allowUnassigned = false) {
        if (this.isAdmin(user))
            return;
        if (!this.isNursingProvider(user))
            throw new common_2.ForbiddenException('nursing provider role required');
        if (b.provider_id !== user?.id && !(allowUnassigned && !b.provider_id)) {
            throw new common_2.ForbiddenException('visit is not assigned to this provider');
        }
    }
    async createNote(u, body) {
        const patientId = String(body?.patient_id || '').trim();
        const bookingId = String(body?.booking_id || '').trim();
        if (!patientId || !bookingId)
            throw new common_1.BadRequestException('patient_id and booking_id are required');
        const booking = await this.findVisit(bookingId);
        if (booking.patient_id !== patientId)
            throw new common_1.BadRequestException('patient/booking mismatch');
        this.assertProviderMutation(booking, u);
        const note = String(body?.note || '').trim().slice(0, 4000);
        if (!note)
            throw new common_1.BadRequestException('note is required');
        const vitals = {};
        for (const k of ['bp', 'pulse', 'temp', 'spo2', 'glucose']) {
            if (body?.vitals?.[k])
                vitals[k] = String(body.vitals[k]).slice(0, 20);
        }
        const doc = {
            id: (0, uuid_1.v4)(),
            patient_id: patientId,
            nurse_id: u.id,
            booking_id: bookingId,
            note,
            vitals,
            createdAt: new Date(),
        };
        await this.conn.db.collection('nursing_notes').insertOne(doc);
        const { _id, ...rest } = doc;
        return rest;
    }
    async listNotes(u, patientId) {
        if (!this.isAdmin(u) && u?.id !== patientId) {
            if (!this.isNursingProvider(u))
                throw new common_2.ForbiddenException('notes access denied');
            const assigned = await this.bkgModel.findOne({ patient_id: patientId, provider_id: u.id });
            if (!assigned)
                throw new common_2.ForbiddenException('notes access denied');
        }
        return this.conn.db.collection('nursing_notes')
            .find({ patient_id: patientId }, { projection: { _id: 0 } })
            .sort({ createdAt: -1 }).limit(100).toArray();
    }
    async getCatalog() {
        return this.serviceModel.find({ active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }).lean();
    }
    async createCatalog(u, b) {
        throw new common_1.ServiceUnavailableException('admin service catalog publication is unavailable pending versioned clinical, operations and finance approval workflow');
    }
    async updateCatalog(u, id, b) {
        throw new common_1.ServiceUnavailableException('admin service catalog publication is unavailable pending versioned clinical, operations and finance approval workflow');
    }
    async deleteCatalog(u, id) {
        throw new common_1.ServiceUnavailableException('admin service catalog retirement is unavailable pending dependency-aware approval and rollback workflow');
    }
    async getVisits(provider_id, user) {
        if (!this.isAdmin(user) && !this.isNursingProvider(user))
            throw new common_2.ForbiddenException('nursing provider role required');
        const pId = this.isAdmin(user) ? (provider_id || undefined) : user.id;
        return this.bkgModel.find(pId ? { provider_id: pId } : {}).sort({ scheduled_at: 1 }).lean();
    }
    async getVisitById(id, user) {
        const v = await this.findVisit(id);
        this.assertReadAccess(v, user);
        return v.toObject ? v.toObject() : v;
    }
    async getVisitTracking(id, user) {
        const b = await this.findVisit(id);
        this.assertReadAccess(b, user);
        const destLat = b.patient_location?.lat ?? null;
        const destLng = b.patient_location?.lng ?? null;
        const curLat = b.gps_tracking?.current_lat ?? null;
        const curLng = b.gps_tracking?.current_lng ?? null;
        let eta = null;
        if (curLat != null && curLng != null && destLat != null && destLng != null) {
            const km = this.haversineKm(curLat, curLng, destLat, destLng);
            eta = Math.max(1, Math.round((km / 30) * 60));
        }
        return {
            booking_id: b.id,
            nurse_phone: b.provider_phone || null,
            hospital_lat: destLat,
            hospital_lng: destLng,
            current_lat: curLat,
            current_lng: curLng,
            eta_minutes: eta,
            status: b.state,
            vitals: b.vitals && Object.keys(b.vitals).length ? b.vitals : null,
            notes: b.clinical_notes || null,
        };
    }
    haversineKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    }
    respondToVisit() {
        throw new common_1.ServiceUnavailableException('legacy_nursing_visit_response_disabled_pending_governed_payment_coverage_capacity_command');
    }
    async startTransit(id, user) {
        const b = await this.findVisit(id);
        this.assertProviderMutation(b, user);
        if (b.state !== home_care_schema_1.NursingBookingState.CONFIRMED)
            throw new common_1.BadRequestException('Invalid state transition');
        b.state = home_care_schema_1.NursingBookingState.IN_TRANSIT;
        b.timers.transit_started_at = new Date();
        b.markModified('timers');
        b.state_history.push({ from: home_care_schema_1.NursingBookingState.CONFIRMED, to: b.state, at: new Date() });
        await b.save();
        this.events.emit('patient.notify', { patientId: b.patient_id, type: 'nursing_transit', message: 'الممرض في الطريق إليك', metadata: { bookingId: b.id } });
        return { success: true, state: b.state };
    }
    async arriveAtPatient(id, body, user) {
        const b = await this.findVisit(id);
        this.assertProviderMutation(b, user);
        if (!Number.isFinite(body?.lat) || !Number.isFinite(body?.lng) || body.lat < -90 || body.lat > 90 || body.lng < -180 || body.lng > 180) {
            throw new common_1.BadRequestException('valid lat/lng required');
        }
        const patientLat = b.address?.lat;
        const patientLng = b.address?.lng;
        if (Number.isFinite(patientLat) && Number.isFinite(patientLng)) {
            const dist = Math.sqrt(Math.pow(patientLat - body.lat, 2) + Math.pow(patientLng - body.lng, 2));
            if (dist > 0.005) {
                throw new common_1.BadRequestException('You are not close enough to the patient location (< 500m)');
            }
        }
        b.state = home_care_schema_1.NursingBookingState.ARRIVED;
        b.timers.arrived_at = new Date();
        b.timers.no_show_timer_started_at = new Date();
        b.markModified('timers');
        b.gps_tracking.current_lat = body.lat;
        b.gps_tracking.current_lng = body.lng;
        b.markModified('gps_tracking');
        b.state_history.push({ from: home_care_schema_1.NursingBookingState.IN_TRANSIT, to: b.state, at: new Date() });
        await b.save();
        this.events.emit('patient.notify', { patientId: b.patient_id, type: 'nursing_arrived', message: 'الممرض بالباب', metadata: { bookingId: b.id } });
        return { success: true, state: b.state };
    }
    async startCare(id, user) {
        const b = await this.findVisit(id);
        this.assertProviderMutation(b, user);
        if (b.state !== home_care_schema_1.NursingBookingState.ARRIVED)
            throw new common_1.BadRequestException('Invalid state transition');
        const from = b.state;
        b.state = home_care_schema_1.NursingBookingState.CARE_IN_PROGRESS;
        b.timers.care_started_at = new Date();
        b.markModified('timers');
        b.state_history.push({ from, to: b.state, at: new Date() });
        await b.save();
        return { success: true, state: b.state };
    }
    async triggerNoShow(id, user) {
        const b = await this.findVisit(id);
        this.assertProviderMutation(b, user);
        if (b.state !== home_care_schema_1.NursingBookingState.ARRIVED)
            throw new common_1.BadRequestException('Must be arrived to trigger no-show');
        const startedAt = b.timers?.no_show_timer_started_at ? new Date(b.timers.no_show_timer_started_at).getTime() : 0;
        const elapsedMs = Date.now() - startedAt;
        if (elapsedMs < 10 * 60 * 1000) {
            throw new common_1.BadRequestException('Cannot trigger No-Show until 10 minutes have elapsed since arrival');
        }
        b.state = home_care_schema_1.NursingBookingState.NO_SHOW;
        b.state_history.push({ from: home_care_schema_1.NursingBookingState.ARRIVED, to: b.state, at: new Date() });
        await b.save();
        return { success: true, state: b.state };
    }
    async triggerEmergency(id, body, user) {
        const b = await this.findVisit(id);
        this.assertProviderMutation(b, user);
        if (!String(body?.reason || '').trim())
            throw new common_1.BadRequestException('reason is required');
        if (![home_care_schema_1.NursingBookingState.IN_TRANSIT, home_care_schema_1.NursingBookingState.ARRIVED, home_care_schema_1.NursingBookingState.CARE_IN_PROGRESS].includes(b.state))
            throw new common_1.BadRequestException('Invalid state transition');
        const from = b.state;
        b.state = home_care_schema_1.NursingBookingState.ESCALATED_EMERGENCY;
        b.emergency_escalation = { reason: String(body.reason).trim().slice(0, 1000), refunded_amount: 0, refund_status: 'pending_finance_review', at: new Date() };
        b.state_history.push({ from, to: home_care_schema_1.NursingBookingState.ESCALATED_EMERGENCY, at: new Date() });
        await b.save();
        this.events.emit('patient.notify', { patientId: b.patient_id, type: 'nursing_emergency', message: 'تم إيقاف الخدمة لدواعٍ طبية - ستتم مراجعة الاسترداد مالياً', metadata: { bookingId: b.id, refund_status: 'pending_finance_review' } });
        return { success: true, state: b.state };
    }
    async completeVisit(id, body, user) {
        const b = await this.findVisit(id);
        this.assertProviderMutation(b, user);
        if (b.state !== home_care_schema_1.NursingBookingState.CARE_IN_PROGRESS)
            throw new common_1.BadRequestException('Invalid state transition');
        const from = b.state;
        const { vitals, clinical_notes, recommendations, signature_base64 } = body;
        b.state = home_care_schema_1.NursingBookingState.COMPLETED;
        b.timers.completed_at = new Date();
        b.markModified('timers');
        b.vitals = vitals || b.vitals;
        b.clinical_notes = clinical_notes || b.clinical_notes;
        b.recommendations = recommendations || b.recommendations;
        b.patient_signature_base64 = signature_base64;
        b.state_history.push({ from, to: b.state, at: new Date() });
        await b.save();
        this.events.emit('patient.notify', { patientId: b.patient_id, type: 'nursing_completed', message: 'اكتملت الخدمة - فضلاً قيم الممرض', metadata: { bookingId: b.id } });
        if (b.referring_doctor_id) {
            this.events.emit('doctor.notify', { doctorId: b.referring_doctor_id, type: 'nursing_report', message: 'اكتملت خطة التمريض المنزلي', metadata: { bookingId: b.id } });
        }
        return { success: true, state: b.state };
    }
    async getWalletData(user, providerId) {
        const isStaff = user?.role === 'admin' || user?.role === 'super_admin';
        if (!isStaff && !this.isNursingProvider(user))
            throw new common_2.ForbiddenException('nursing provider role required');
        const pId = isStaff && providerId ? providerId : user?.id;
        if (!pId)
            throw new common_1.BadRequestException('provider context required');
        const bookings = await this.bkgModel.find({ provider_id: pId }).lean();
        let balance = 0;
        let pendingEscrow = 0;
        const transactions = [];
        const realAmount = (b) => {
            const n = Number(b?.service_fee ?? b?.total_price ?? b?.total ?? b?.price ?? 0);
            return Number.isFinite(n) && n >= 0 ? n : 0;
        };
        for (const b of bookings) {
            const amount = realAmount(b);
            if (b.state === home_care_schema_1.NursingBookingState.COMPLETED) {
                balance += amount;
                transactions.push({
                    id: b.id + '-service',
                    date: b.scheduled_at ? new Date(b.scheduled_at).toISOString().slice(0, 16).replace('T', ' ') : new Date(b.createdAt || Date.now()).toISOString().slice(0, 16).replace('T', ' '),
                    amount,
                    type: 'EARNING',
                    title: `زيارة منزلية (طلب ${b.id})`
                });
                if (b.transportation_fee && b.transportation_fee > 0) {
                    balance += b.transportation_fee;
                    transactions.push({
                        id: b.id + '-transport',
                        date: b.scheduled_at ? new Date(b.scheduled_at).toISOString().slice(0, 16).replace('T', ' ') : new Date(b.createdAt || Date.now()).toISOString().slice(0, 16).replace('T', ' '),
                        amount: b.transportation_fee,
                        type: 'ALLOWANCE',
                        title: `بدل مواصلات (طلب ${b.id})`
                    });
                }
            }
            else {
                pendingEscrow += amount;
            }
        }
        return {
            balance,
            pendingEscrow,
            transactions: transactions.reverse(),
        };
    }
};
exports.NursingController = NursingController;
__decorate([
    (0, common_1.Post)('notes'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "createNote", null);
__decorate([
    (0, common_1.Get)('notes/:patientId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('patientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "listNotes", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('catalog'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "getCatalog", null);
__decorate([
    (0, common_1.Post)('admin/catalog'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "createCatalog", null);
__decorate([
    (0, common_1.Put)('admin/catalog/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "updateCatalog", null);
__decorate([
    (0, common_1.Delete)('admin/catalog/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "deleteCatalog", null);
__decorate([
    (0, common_1.Get)('visits'),
    __param(0, (0, common_1.Query)('provider_id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "getVisits", null);
__decorate([
    (0, common_1.Get)('visits/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "getVisitById", null);
__decorate([
    (0, common_1.Get)('visits/:id/tracking'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "getVisitTracking", null);
__decorate([
    (0, common_1.Post)('visits/:id/respond'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NursingController.prototype, "respondToVisit", null);
__decorate([
    (0, common_1.Post)('visits/:id/transit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "startTransit", null);
__decorate([
    (0, common_1.Post)('visits/:id/arrive'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "arriveAtPatient", null);
__decorate([
    (0, common_1.Post)('visits/:id/start-care'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "startCare", null);
__decorate([
    (0, common_1.Post)('visits/:id/no-show'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "triggerNoShow", null);
__decorate([
    (0, common_1.Post)('visits/:id/emergency-abort'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "triggerEmergency", null);
__decorate([
    (0, common_1.Post)('visits/:id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "completeVisit", null);
__decorate([
    (0, common_1.Get)('wallet'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('provider_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NursingController.prototype, "getWalletData", null);
exports.NursingController = NursingController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('nursing'),
    __param(0, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(1, (0, mongoose_1.InjectModel)('HomeCareService')),
    __param(2, (0, mongoose_1.InjectModel)('NurseProvider')),
    __param(3, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Connection,
        event_emitter_1.EventEmitter2,
        workflow_engine_module_1.WorkflowEngineService])
], NursingController);
let HomeCareContractController = class HomeCareContractController {
    constructor(bookings) {
        this.bookings = bookings;
    }
    async getOwnedBooking(user, bookingId) {
        const booking = await this.bookings.findOne({ id: bookingId, patient_id: user?.id }).lean();
        if (!booking)
            throw new common_1.NotFoundException('home_care_booking_not_found');
        const timeline = (Array.isArray(booking.state_history) ? booking.state_history : [])
            .map((entry) => ({ status: entry?.to || entry?.state || null, at: entry?.at ? new Date(entry.at).toISOString() : null }))
            .filter((entry) => entry.status && entry.at);
        return {
            id: booking.id,
            status: booking.state,
            service_type: booking.service_name_ar || booking.service_name_en || null,
            scheduled_at: booking.scheduled_at ? new Date(booking.scheduled_at).toISOString() : null,
            nurse: {
                display_name: booking.provider_name || null,
                avatar_url: null,
            },
            timeline,
        };
    }
};
exports.HomeCareContractController = HomeCareContractController;
__decorate([
    (0, common_1.Get)('bookings/:bookingId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], HomeCareContractController.prototype, "getOwnedBooking", null);
exports.HomeCareContractController = HomeCareContractController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('home-care'),
    __param(0, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], HomeCareContractController);
//# sourceMappingURL=home-care.controller.js.map