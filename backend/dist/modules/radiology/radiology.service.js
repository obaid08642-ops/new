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
exports.RadiologyOpsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const event_emitter_1 = require("@nestjs/event-emitter");
const ALLOWED_ROLES_PROVIDER = ['radiology', 'admin', 'hospital'];
let RadiologyOpsService = class RadiologyOpsService {
    constructor(svcModel, bkgModel, centerBkgModel, userModel, resultModel, storageObjects, engine, events) {
        this.svcModel = svcModel;
        this.bkgModel = bkgModel;
        this.centerBkgModel = centerBkgModel;
        this.userModel = userModel;
        this.resultModel = resultModel;
        this.storageObjects = storageObjects;
        this.engine = engine;
        this.events = events;
    }
    async findBooking(id) {
        return (await this.bkgModel.findOne({ id })) || (await this.centerBkgModel.findOne({ id }));
    }
    async privateProviderStorage(id, user, requirePdf = false) {
        const object = await this.storageObjects.findOne({ id, owner_account_id: user.id, visibility: 'private', deleted: false }).lean();
        if (!object)
            throw new common_1.ForbiddenException('private_storage_object_not_owned');
        if (requirePdf && object.mime !== 'application/pdf')
            throw new common_1.BadRequestException('report_pdf_storage_object_required');
        return object;
    }
    async transition(id, targetState, user, note) {
        const b = await this.findBooking(id);
        if (!b)
            throw new common_1.NotFoundException('Radiology booking not found');
        let current = b.state || b.status;
        const aliases = { PENDING_ACCEPTANCE: 'NEW_REQUEST', ACCEPTED: 'CONFIRMED', CHECKED_IN: 'ARRIVED_CHECKIN', SCANNING_COMPLETED: 'REPORT_DRAFT', REPORT_UPLOADED: 'REPORT_DRAFT' };
        current = aliases[current] || current;
        const allowed = radiology_schema_1.RADIOLOGY_BOOKING_TRANSITIONS[current] ?? [];
        if (!allowed.includes(targetState)) {
            throw new common_1.BadRequestException(`Cannot transition from ${current} to ${targetState}`);
        }
        b.state_history = [...(b.state_history || []), { from: current, to: targetState, by_user_id: user.id, by_role: user.role, at: new Date(), note }];
        b.state = targetState;
        if (b.status !== undefined)
            b.status = targetState;
        b.markModified?.('state_history');
        await b.save();
        this.events.emit('radiology.state_changed', { bookingId: id, state: targetState, patientId: b.patient_id });
        return b;
    }
    async checkin(id, user) {
        const b = await this.findBooking(id);
        if (!b)
            throw new common_1.NotFoundException();
        if (b.state !== radiology_schema_1.RadiologyBookingState.CONFIRMED)
            throw new common_1.BadRequestException('Booking must be CONFIRMED to check-in');
        (b.state_history = b.state_history || []).push({ from: b.state, to: radiology_schema_1.RadiologyBookingState.ARRIVED_CHECKIN, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'Patient checked-in at reception' });
        b.state = radiology_schema_1.RadiologyBookingState.ARRIVED_CHECKIN;
        b.checkin_at = new Date();
        await b.save();
        this.events.emit('radiology.state_changed', { bookingId: id, state: radiology_schema_1.RadiologyBookingState.ARRIVED_CHECKIN, patientId: b.patient_id });
        return b;
    }
    async startScan(id, user) {
        const b = await this.findBooking(id);
        if (!b)
            throw new common_1.NotFoundException();
        if (b.state !== radiology_schema_1.RadiologyBookingState.ARRIVED_CHECKIN)
            throw new common_1.BadRequestException('Patient must check-in first');
        (b.state_history = b.state_history || []).push({ from: b.state, to: radiology_schema_1.RadiologyBookingState.IN_SCANNING, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'Scan started — patient called into scanning room' });
        b.state = radiology_schema_1.RadiologyBookingState.IN_SCANNING;
        b.scan_started_at = new Date();
        await b.save();
        this.events.emit('radiology.state_changed', { bookingId: id, state: radiology_schema_1.RadiologyBookingState.IN_SCANNING, patientId: b.patient_id });
        return b;
    }
    async abortScan(id, user, reason) {
        const VALID_ABORT_REASONS = ['PATIENT_PANIC', 'MACHINE_FAILURE', 'CONTRAST_REACTION', 'CLAUSTROPHOBIA', 'PATIENT_NO_SHOW', 'TECHNICAL_ERROR', 'EMERGENCY_SHUTDOWN'];
        if (!VALID_ABORT_REASONS.includes(reason)) {
            throw new common_1.BadRequestException(`Invalid abort reason. Must be one of: ${VALID_ABORT_REASONS.join(', ')}`);
        }
        const b = await this.findBooking(id);
        if (!b)
            throw new common_1.NotFoundException();
        const abortable = [radiology_schema_1.RadiologyBookingState.ARRIVED_CHECKIN, radiology_schema_1.RadiologyBookingState.IN_SCANNING];
        if (!abortable.includes(b.state)) {
            throw new common_1.BadRequestException(`invalid_transition_${b.state}_to_SCAN_ABORTED`);
        }
        b.abort_reason = reason;
        (b.state_history = b.state_history || []).push({ from: b.state, to: radiology_schema_1.RadiologyBookingState.SCAN_ABORTED, by_user_id: user.id, by_role: user.role, at: new Date(), note: `EMERGENCY ABORT: ${reason}` });
        b.state = radiology_schema_1.RadiologyBookingState.SCAN_ABORTED;
        b.scan_completed_at = new Date();
        await b.save();
        this.events.emit('radiology.scan_aborted', { bookingId: id, reason, patientId: b.patient_id, providerAccountId: b.provider_account_id });
        return b;
    }
    async uploadReport(id, user, body) {
        const b = await this.findBooking(id);
        if (!b)
            throw new common_1.NotFoundException();
        if (body.pdf_url || body.dicom_url || body.image_urls)
            throw new common_1.BadRequestException('raw_report_urls_not_allowed');
        const reportObjectId = String(body.report_storage_object_id || '').trim();
        if (!reportObjectId)
            throw new common_1.BadRequestException('report_storage_object_id_required');
        await this.privateProviderStorage(reportObjectId, user, true);
        if (body.dicom_storage_object_id)
            await this.privateProviderStorage(String(body.dicom_storage_object_id), user);
        const imageObjectIds = Array.isArray(body.scan_storage_object_ids) ? body.scan_storage_object_ids.map(String) : [];
        for (const objectId of imageObjectIds)
            await this.privateProviderStorage(objectId, user);
        b.report_storage_object_id = reportObjectId;
        b.dicom_storage_object_id = body.dicom_storage_object_id ? String(body.dicom_storage_object_id) : undefined;
        b.scan_storage_object_ids = imageObjectIds;
        b.signed_report_pdf_url = undefined;
        b.dicom_url = undefined;
        b.scan_image_urls = [];
        if (body.findings)
            b.clinical_impression_report = body.findings;
        b.report_status = 'draft';
        (b.state_history = b.state_history || []).push({ from: b.state || b.status, to: radiology_schema_1.RadiologyBookingState.REPORT_DRAFT, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'Report files uploaded by technician' });
        b.state = radiology_schema_1.RadiologyBookingState.REPORT_DRAFT;
        if (b.status !== undefined)
            b.status = radiology_schema_1.RadiologyBookingState.REPORT_DRAFT;
        b.markModified?.('state_history');
        await b.save();
        return b;
    }
    async submitReportForReview(id, user, body) {
        const b = await this.findBooking(id);
        if (!b)
            throw new common_1.NotFoundException();
        if (!b.report_storage_object_id)
            throw new common_1.BadRequestException('secure_report_storage_object_required_before_review');
        b.report_status = 'under_review';
        (b.state_history = b.state_history || []).push({ from: b.state, to: radiology_schema_1.RadiologyBookingState.UNDER_REVIEW, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'Submitted for radiologist quality review' });
        b.state = radiology_schema_1.RadiologyBookingState.UNDER_REVIEW;
        if (b.status !== undefined)
            b.status = radiology_schema_1.RadiologyBookingState.UNDER_REVIEW;
        b.markModified?.('state_history');
        await b.save();
        this.events.emit('radiology.report_under_review', { bookingId: id });
        return b;
    }
    async approveReport(id, user) {
        const b = await this.findBooking(id);
        if (!b)
            throw new common_1.NotFoundException();
        if ((b.state || b.status) !== radiology_schema_1.RadiologyBookingState.UNDER_REVIEW)
            throw new common_1.BadRequestException('Report must be UNDER_REVIEW to approve');
        b.report_status = 'ready';
        b.report_approved_by = user.id;
        b.report_approved_at = new Date();
        (b.state_history = b.state_history || []).push({ from: b.state, to: radiology_schema_1.RadiologyBookingState.REPORT_READY, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'Report approved and published by radiologist' });
        b.state = radiology_schema_1.RadiologyBookingState.REPORT_READY;
        if (b.status !== undefined)
            b.status = radiology_schema_1.RadiologyBookingState.REPORT_READY;
        b.markModified?.('state_history');
        await b.save();
        if (b.referring_doctor_id) {
            this.events.emit('radiology.doctor_notify', { bookingId: id, doctorId: b.referring_doctor_id, patientId: b.patient_id, pdfUrl: b.signed_report_pdf_url, dicomUrl: b.dicom_url });
            b.doctor_notified = true;
            await b.save();
        }
        this.events.emit('radiology.state_changed', { bookingId: id, state: radiology_schema_1.RadiologyBookingState.REPORT_READY, patientId: b.patient_id });
        return b;
    }
    async publishReport(id, body, user) {
        return this.approveReport(id, user);
    }
    async processInsuranceApproval(id, user, body) {
        const b = await this.findBooking(id);
        if (!b)
            throw new common_1.NotFoundException();
        const insurancePhase = [radiology_schema_1.RadiologyBookingState.NEW_REQUEST, radiology_schema_1.RadiologyBookingState.PENDING_INSURANCE, radiology_schema_1.RadiologyBookingState.WAITING_COPAY];
        if (!insurancePhase.includes(b.state)) {
            throw new common_1.BadRequestException(`invalid_transition_${b.state}_to_insurance_approval`);
        }
        b.insurance_approval_code = body.approval_code;
        b.insurance_copay = body.copay;
        b.insurance_status = 'approved';
        const nextState = body.copay > 0 ? radiology_schema_1.RadiologyBookingState.WAITING_COPAY : radiology_schema_1.RadiologyBookingState.CONFIRMED;
        (b.state_history = b.state_history || []).push({ from: b.state, to: nextState, by_user_id: user.id, by_role: user.role, at: new Date(), note: `NPHIES approved. Code: ${body.approval_code}. Copay: ${body.copay} SAR` });
        b.state = nextState;
        await b.save();
        this.events.emit('radiology.insurance_approved', { bookingId: id, patientId: b.patient_id, copay: body.copay });
        return b;
    }
    async rescheduleBooking(id, user, body) {
        const b = await this.findBooking(id);
        if (!b)
            throw new common_1.NotFoundException();
        const oldDate = b.scheduled_at;
        b.scheduled_at = new Date(body.new_date);
        b.reschedule_reason = body.reason;
        (b.state_history = b.state_history || []).push({ from: b.state, to: b.state, by_user_id: user.id, by_role: user.role, at: new Date(), note: `Rescheduled from ${oldDate} to ${b.scheduled_at}. Reason: ${body.reason}` });
        await b.save();
        this.events.emit('radiology.rescheduled', { bookingId: id, patientId: b.patient_id, newDate: b.scheduled_at });
        return b;
    }
    async getTracking(id, user) {
        const b = await this.bkgModel.findOne({ id }).lean();
        if (!b)
            throw new common_1.NotFoundException();
        const steps = (b.state_history || []).map((h) => ({
            state: h.to,
            label_ar: this._stateLabel(h.to, 'ar'),
            label_en: this._stateLabel(h.to, 'en'),
            at: h.at,
            done: true,
        }));
        return {
            current_state: b.state,
            patient_label_ar: this._stateLabel(b.state, 'ar'),
            patient_label_en: this._stateLabel(b.state, 'en'),
            scheduled_at: b.scheduled_at,
            preparation_confirmed: b.preparation_confirmed,
            steps,
        };
    }
    _stateLabel(state, lang) {
        const map = {
            NEW_REQUEST: { ar: 'جاري مراجعة الطلب', en: 'Request under review' },
            PENDING_INSURANCE: { ar: 'ننتظر موافقة التأمين', en: 'Awaiting insurance approval' },
            WAITING_COPAY: { ar: 'مطلوب دفع نسبة التحمل', en: 'Co-pay required' },
            CONFIRMED: { ar: 'تم التأكيد - بانتظار حضورك', en: 'Confirmed — please arrive on time' },
            ARRIVED_CHECKIN: { ar: 'أنت الآن بالمركز', en: 'You are at the center' },
            IN_SCANNING: { ar: 'جاري إجراء الفحص', en: 'Scan in progress' },
            REPORT_DRAFT: { ar: 'جاري إعداد التقرير', en: 'Report being prepared' },
            UNDER_REVIEW: { ar: 'التقرير قيد المراجعة', en: 'Report under review' },
            REPORT_READY: { ar: 'نتيجتك جاهزة', en: 'Your result is ready' },
            SCAN_ABORTED: { ar: 'تم إلغاء الفحص (حالة طارئة)', en: 'Scan cancelled (emergency)' },
            CANCELLED: { ar: 'تم الإلغاء', en: 'Cancelled' },
        };
        return map[state]?.[lang] ?? state;
    }
    async catalogDeltaRequest(user, body) {
        this.events.emit('radiology.catalog_delta', { providerAccountId: user.account_id ?? user.id, changes: body, requestedBy: user.id });
        return { ok: true, message: 'Delta request submitted for admin approval. Changes will not appear to patients until approved.' };
    }
    async confirmPreparation(id, user) {
        const b = await this.findBooking(id);
        if (!b)
            throw new common_1.NotFoundException();
        b.preparation_confirmed = true;
        b.preparation_confirmed_at = new Date();
        await b.save();
        return { ok: true };
    }
    async list(opts) {
        const q = { is_deleted: false, active: true, public_eligibility: true, medical_review_status: 'approved' };
        if (opts.modality)
            q.modality = opts.modality;
        if (opts.body_part)
            q.body_part = opts.body_part;
        if (opts.search)
            q.$text = { $search: opts.search };
        if (opts.home_only)
            q.home_visit_supported = true;
        return this.svcModel.find(q).sort({ popularity: -1 }).lean();
    }
    async modalities() {
        return this.svcModel.distinct('modality', { is_deleted: false, active: true, public_eligibility: true, medical_review_status: 'approved' });
    }
    async getById(id) {
        const base = { is_deleted: false, active: true, public_eligibility: true, medical_review_status: 'approved' };
        const or = [{ short_code: id }];
        if (mongoose_2.Types.ObjectId.isValid(id))
            or.unshift({ _id: new mongoose_2.Types.ObjectId(id) });
        const svc = await this.svcModel.findOne({ ...base, $or: or }).lean();
        if (!svc)
            throw new common_1.NotFoundException();
        return svc;
    }
    async book(user, body) {
        if (body?.service_id) {
            const dupe = await this.bkgModel.findOne({
                patient_id: user.id,
                service_id: body.service_id,
                createdAt: { $gte: new Date(Date.now() - 3 * 60_000) },
                state: { $nin: [radiology_schema_1.RadiologyBookingState.CANCELLED, radiology_schema_1.RadiologyBookingState.REPORT_READY] },
            }).lean();
            if (dupe)
                return dupe;
        }
        const booking = await this.bkgModel.create({
            ...body,
            id: require('uuid').v4(),
            patient_id: user.id,
            state: radiology_schema_1.RadiologyBookingState.NEW_REQUEST,
        });
        this.events.emit('radiology.new_booking', { bookingId: booking.id, patientId: user.id });
        return booking;
    }
    async mineFor(user) {
        return this.bkgModel.find({ patient_id: user.id }).sort({ createdAt: -1 }).lean();
    }
    async getBooking(id, user) {
        const b = await this.bkgModel.findOne({ id }).lean();
        if (!b)
            throw new common_1.NotFoundException();
        return b;
    }
    async cancel(id, user) {
        return this.transition(id, radiology_schema_1.RadiologyBookingState.CANCELLED, user, 'Cancelled by user');
    }
    async updateInsuranceStatus(id, user, status, reason) {
        const b = await this.findBooking(id);
        if (!b)
            throw new common_1.NotFoundException();
        b.insurance_status = status;
        if (reason)
            b.rejection_reason = reason;
        await b.save();
        return b;
    }
    async addDocument(id, user, body) {
        const b = await this.findBooking(id);
        if (!b)
            throw new common_1.NotFoundException();
        b.documents.push({ ...body, uploaded_at: new Date() });
        await b.save();
        return b;
    }
    async listForProvider(user, status) {
        const q = { provider_account_id: user.account_id ?? user.id };
        if (status)
            q.state = status;
        return this.bkgModel.find(q).sort({ scheduled_at: 1 }).lean();
    }
    async assignTechnician(id, user, body) {
        const b = await this.findBooking(id);
        if (!b)
            throw new common_1.NotFoundException();
        b.technician_id = body.technician_id;
        await b.save();
        return b;
    }
    async adminListAll(opts) {
        const q = {};
        if (opts.status)
            q.state = opts.status;
        if (opts.insurance_status)
            q.insurance_status = opts.insurance_status;
        const limit = opts.limit || 50;
        return this.bkgModel.find(q).sort({ createdAt: -1 }).limit(limit).lean();
    }
    async myReports(user) {
        const me = await this.userModel.findOne({ id: user.id }, { _id: 1 }).lean();
        const ids = me?._id ? [user.id, me._id] : [user.id];
        const [legacy, center] = await Promise.all([
            this.bkgModel.find({ patient_id: { $in: ids }, state: radiology_schema_1.RadiologyBookingState.REPORT_READY }, { _id: 0, __v: 0 }).lean(),
            this.centerBkgModel.find({ patient_id: { $in: ids }, status: radiology_schema_1.RadiologyBookingState.REPORT_READY }, { _id: 0, __v: 0 }).lean(),
        ]);
        return [...legacy, ...center].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }
    async createCatalog(user, body) {
        if (user.role !== 'admin')
            throw new common_1.ForbiddenException();
        return this.svcModel.create({ ...body, id: require('uuid').v4() });
    }
    async updateCatalog(user, id, body) {
        if (user.role !== 'admin')
            throw new common_1.ForbiddenException();
        const updated = await this.svcModel.findOneAndUpdate({ id }, { $set: body }, { new: true });
        if (!updated)
            throw new common_1.NotFoundException();
        return updated;
    }
    async deleteCatalog(user, id) {
        if (user.role !== 'admin')
            throw new common_1.ForbiddenException();
        const deleted = await this.svcModel.findOneAndDelete({ id });
        if (!deleted)
            throw new common_1.NotFoundException();
        return { ok: true };
    }
    async adminForceState(user, id, targetState, note) {
        if (user.role !== 'admin')
            throw new common_1.ForbiddenException('admin_only');
        const b = await this.findBooking(id);
        if (!b)
            throw new common_1.NotFoundException();
        (b.state_history = b.state_history || []).push({ from: b.state, to: targetState, by_user_id: user.id, by_role: user.role, at: new Date(), note: `admin_forced: ${note}` });
        b.state = targetState;
        await b.save();
        return b;
    }
};
exports.RadiologyOpsService = RadiologyOpsService;
exports.RadiologyOpsService = RadiologyOpsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('RadiologyService')),
    __param(1, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(2, (0, mongoose_1.InjectModel)('RadiologyCenterBooking')),
    __param(3, (0, mongoose_1.InjectModel)('User')),
    __param(4, (0, mongoose_1.InjectModel)('LabResult')),
    __param(5, (0, mongoose_1.InjectModel)('StorageObject')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        workflow_engine_module_1.WorkflowEngineService,
        event_emitter_1.EventEmitter2])
], RadiologyOpsService);
//# sourceMappingURL=radiology.service.js.map