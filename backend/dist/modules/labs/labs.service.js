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
exports.LabsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const lab_schema_1 = require("../../schemas/lab.schema");
const event_emitter_1 = require("@nestjs/event-emitter");
const event_bus_service_1 = require("../events/event-bus.service");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const lab_pdf_service_1 = require("./lab-pdf.service");
const labservice_repository_1 = require("./repositories/labservice.repository");
const labbooking_repository_1 = require("./repositories/labbooking.repository");
const labsample_repository_1 = require("./repositories/labsample.repository");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const auth_guard_1 = require("../../common/auth.guard");
let LabsService = class LabsService {
    constructor(svcModel, bkgModel, sampleModel, providerProfiles, events, bus, engine, pdfService) {
        this.svcModel = svcModel;
        this.bkgModel = bkgModel;
        this.sampleModel = sampleModel;
        this.providerProfiles = providerProfiles;
        this.events = events;
        this.bus = bus;
        this.engine = engine;
        this.pdfService = pdfService;
    }
    async list(opts) {
        const q = { active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' };
        if (opts.category)
            q.category = opts.category;
        if (opts.home_only)
            q.home_visit_supported = true;
        if (opts.packages_only)
            q.is_package = true;
        q.$and = [{ category: { $ne: 'imaging' } }, { sample_type: { $ne: 'imaging' } }];
        if (opts.search) {
            const re = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            q.$or = [{ name_ar: re }, { name_en: re }, { short_code: re }];
        }
        let sortObj = { popularity: -1, name_ar: 1 };
        if (opts.highest_rated)
            sortObj = { rating: -1, popularity: -1 };
        else if (opts.lowest_price)
            sortObj = { price: 1, popularity: -1 };
        return this.svcModel.find(q, { _id: 0, __v: 0 }).sort(sortObj).limit(120);
    }
    async categoryCounts() {
        const agg = await this.svcModel.aggregate([
            { $match: { active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved', is_package: false, category: { $ne: 'imaging' }, sample_type: { $ne: 'imaging' } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $project: { _id: 0, slug: '$_id', count: 1 } },
            { $sort: { count: -1 } },
        ]);
        return agg;
    }
    async getById(id) {
        const s = await this.svcModel.findOne({ id, active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }, { _id: 0, __v: 0 });
        if (!s)
            throw new common_1.NotFoundException();
        return s;
    }
    async compatibleProviders(testIds) {
        const ids = [...new Set((testIds || []).filter(Boolean))];
        if (!ids.length)
            return [];
        const services = await this.svcModel.find({ id: { $in: ids }, active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }, { _id: 0, category: 1 });
        if (services.length !== ids.length)
            return [];
        const categories = [...new Set(services.map((service) => service.category).filter(Boolean))];
        const profiles = await this.providerProfiles.find({
            type: { $in: ['lab', 'hospital'] },
            status: 'active',
            public_eligibility: true,
            medical_review_status: 'approved',
            account_id: { $exists: true, $ne: null },
            ...(categories.length ? { test_categories: { $all: categories } } : {}),
        }, { _id: 0, account_id: 1, id: 1, name_ar: 1, name_en: 1, home_visit_supported: 1, rating_avg: 1, rating_count: 1, logo: 1 }).limit(50).lean();
        return profiles.map((profile) => ({
            id: profile.account_id,
            facility_id: profile.id,
            name: profile.name_ar || profile.name_en,
            homeVisitAvailable: Boolean(profile.home_visit_supported),
            rating: profile.rating_count > 0 ? profile.rating_avg : null,
            logo: profile.logo || null,
        }));
    }
    async book(user, data) {
        if (!Array.isArray(data.items) || !data.items.length)
            throw new common_1.BadRequestException('items required');
        if (!data.scheduled_at)
            throw new common_1.BadRequestException('scheduled_at required');
        const services = await this.svcModel.find({ id: { $in: data.items.map((x) => x.service_id) } });
        if (!services.length)
            throw new common_1.BadRequestException('no_valid_services');
        const paymentMethod = ['cash', 'card', 'insurance'].includes(data.payment_method) ? data.payment_method : 'cash';
        if (['in_clinic', 'clinic', 'lab', 'center'].includes(data.location_type))
            data.location_type = 'facility';
        if (!['home', 'facility'].includes(data.location_type))
            data.location_type = 'home';
        const svcCtx = data.location_type === 'home' ? 'home_visit' : 'in_clinic';
        const pmAllowed = {
            home_visit: ['card', 'insurance'],
            in_clinic: ['cash', 'card', 'insurance'],
        };
        if (!pmAllowed[svcCtx]?.includes(paymentMethod)) {
            throw new common_1.BadRequestException(`payment_method_${paymentMethod}_not_allowed_for_${svcCtx}`);
        }
        if (!data.provider_account_id && user.role !== 'admin' && user.role !== 'system') {
            throw new common_1.BadRequestException('provider_account_id_required');
        }
        const documents = Array.isArray(data.documents) ? data.documents.map((d) => ({ ...d, uploaded_at: new Date() })) : [];
        if (data.location_type === 'home' && paymentMethod === 'insurance') {
            const hasProof = documents.some(d => d.kind === 'doctor_request' || d.kind === 'preauth');
            if (!hasProof)
                throw new common_1.BadRequestException('insurance_home_requires_doctor_request_or_preauth');
        }
        if (data.location_type === 'home' && services.some((s) => !s.home_visit_supported)) {
            throw new common_1.BadRequestException('some_services_not_home_eligible');
        }
        const slotTime = new Date(data.scheduled_at);
        if (slotTime.getTime() < Date.now() - 5 * 60_000) {
            throw new common_1.BadRequestException('slot_expired');
        }
        if (data.provider_account_id) {
            const slotWindow = 30 * 60_000;
            const overlapping = await this.bkgModel.countDocuments({
                provider_account_id: data.provider_account_id,
                scheduled_at: { $gte: new Date(slotTime.getTime() - slotWindow), $lt: new Date(slotTime.getTime() + slotWindow) },
                state: { $nin: [lab_schema_1.LabBookingState.CANCELLED, lab_schema_1.LabBookingState.REPORTED] },
            });
            if (overlapping >= 3)
                throw new common_1.BadRequestException('slot_taken');
        }
        const items = services.map((s) => ({ service_id: s.id, name_ar: s.name_ar, name_en: s.name_en, price: s.price, sample_type: s.sample_type, fasting_required: s.fasting_required }));
        const dupWindow = new Date(Date.now() - 3 * 60_000);
        const svcIds = data.items.map((x) => x.service_id).sort();
        const recent = await this.bkgModel.find({
            patient_id: user.id,
            createdAt: { $gte: dupWindow },
            state: { $nin: [lab_schema_1.LabBookingState.CANCELLED, lab_schema_1.LabBookingState.REPORTED] },
        }).lean();
        const dupe = recent.find((b) => JSON.stringify((b.items || []).map((i) => i.service_id).sort()) === JSON.stringify(svcIds));
        if (dupe)
            return dupe;
        const total = items.reduce((sum, i) => sum + (i.price || 0), 0) + (data.location_type === 'home' ? 25 : 0);
        const insurance_status = paymentMethod === 'insurance' ? 'pending' : 'none';
        const booking = await this.bkgModel.create({
            patient_id: user.id,
            patient_name: data.contact?.name || user.full_name,
            patient_phone: data.contact?.phone || user.phone,
            items,
            total,
            location_type: data.location_type || 'facility',
            facility_id: data.facility_id,
            provider_account_id: data.provider_account_id,
            address: data.address,
            scheduled_at: new Date(data.scheduled_at),
            state: lab_schema_1.LabBookingState.NEW_REQUEST,
            state_history: [{ from: '', to: lab_schema_1.LabBookingState.NEW_REQUEST, by_user_id: user.id, by_role: user.role, at: new Date() }],
            notes: data.notes,
            payment_method: paymentMethod,
            insurance_provider: data.insurance_provider,
            insurance_member_id: data.insurance_member_id,
            insurance_status,
            documents,
        });
        this.events.emit('lab.booking_created', { booking_id: booking.id, patient_id: user.id, tracking_id: booking.tracking_id });
        this.events.emit('lab.booking_state_changed', { booking_id: booking.id, patient_id: user.id, state: booking.state, tracking_id: booking.tracking_id });
        await this.engine.announceCreated({ kind: 'lab', entity_id: booking.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, meta: { tracking_id: booking.tracking_id, items: items.length, total, location_type: booking.location_type, payment_method: paymentMethod } });
        if (paymentMethod === 'insurance') {
            this.bus.emit({ type: 'insurance.pending', entity_type: 'lab_booking', entity_id: booking.id, patient_account_id: user.id, reason_code: data.insurance_provider || 'unknown_provider', meta: { docs: documents.length } }).catch(() => null);
        }
        if (booking.location_type === 'home') {
            this.bus.emit({ type: 'home_visit.assigned', entity_type: 'lab_booking', entity_id: booking.id, patient_account_id: user.id, meta: { facility_id: booking.facility_id } }).catch(() => null);
        }
        return booking.toObject();
    }
    async addDocument(id, user, body) {
        const b = await this.bkgModel.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException();
        if (b.patient_id !== user.id && user.role !== 'admin')
            throw new common_1.ForbiddenException();
        b.documents.push({ kind: body.kind, url_or_b64: body.url_or_b64, filename: body.filename, uploaded_at: new Date() });
        await b.save();
        this.bus.emit({ type: 'booking.document_uploaded', entity_type: 'lab_booking', entity_id: b.id, actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, meta: { kind: body.kind } }).catch(() => null);
        return b.toObject();
    }
    async updateInsuranceApproval(id, payload, user) {
        if (!(0, auth_guard_1.getEffectiveRoles)(user).some(role => ['admin', 'lab', 'hospital'].includes(role)))
            throw new common_1.ForbiddenException();
        const b = await this.bkgModel.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException();
        const { status, totalCopay, items } = payload;
        if (status) {
            b.insurance_status = status;
        }
        if (totalCopay !== undefined) {
            b.insurance_copay = totalCopay;
        }
        if (items && Array.isArray(items)) {
            for (const itemPayload of items) {
                const item = b.items.find((i) => i.service_id === itemPayload.service_id);
                if (item) {
                    if (itemPayload.isCovered !== undefined)
                        item.isCovered = itemPayload.isCovered;
                    if (itemPayload.rejectReason !== undefined)
                        item.rejectReason = itemPayload.rejectReason;
                    if (itemPayload.cashPrice !== undefined)
                        item.cashPrice = itemPayload.cashPrice;
                }
            }
            b.markModified('items');
        }
        await b.save();
        if (status) {
            this.bus.emit({ type: status === 'approved' || status === 'partial_approval' ? 'insurance.approved' : 'insurance.rejected', entity_type: 'lab_booking', entity_id: b.id, actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id }).catch(() => null);
        }
        return b.toObject();
    }
    async optInCash(id, serviceId, payload, user) {
        const b = await this.bkgModel.findOne({ id, patient_id: user.id });
        if (!b)
            throw new common_1.NotFoundException('Booking not found');
        const item = b.items.find((i) => i.service_id === serviceId);
        if (!item)
            throw new common_1.NotFoundException('Item not found');
        item.optInCash = payload.optInCash ?? true;
        b.markModified('items');
        await b.save();
        return b.toObject();
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
        if ([lab_schema_1.LabBookingState.REPORTED, lab_schema_1.LabBookingState.CANCELLED].includes(b.state))
            return b.toObject();
        return await this.engine.apply({
            kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: lab_schema_1.LabBookingState.CANCELLED,
            actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: 'user_cancelled',
            mutate: async () => {
                b.state_history.push({ from: b.state, to: lab_schema_1.LabBookingState.CANCELLED, by_user_id: user.id, by_role: user.role, at: new Date() });
                b.state = lab_schema_1.LabBookingState.CANCELLED;
                await b.save();
                this.events.emit('lab.booking_state_changed', { booking_id: b.id, patient_id: b.patient_id, state: b.state, tracking_id: b.tracking_id });
                this.events.emit('lab.booking_cancelled', { booking_id: b.id, patient_id: b.patient_id });
                return b.toObject();
            },
        });
    }
    async transition(id, to, user, note) {
        if (!(0, auth_guard_1.getEffectiveRoles)(user).some(role => ['admin', 'lab', 'hospital'].includes(role)))
            throw new common_1.ForbiddenException('admin/lab only');
        const b = await this.bkgModel.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException();
        const allowed = lab_schema_1.LAB_BOOKING_TRANSITIONS[b.state] || [];
        if (!allowed.includes(to))
            throw new common_1.BadRequestException(`invalid transition ${b.state} → ${to}`);
        return await this.engine.apply({
            kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: to,
            actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: note,
            mutate: async () => {
                b.state_history.push({ from: b.state, to, by_user_id: user.id, by_role: user.role, at: new Date(), note });
                b.state = to;
                await b.save();
                this.events.emit('lab.booking_state_changed', { booking_id: b.id, patient_id: b.patient_id, state: to, tracking_id: b.tracking_id });
                return b.toObject();
            },
        });
    }
    async listForProvider(user, status) {
        if (!(0, auth_guard_1.getEffectiveRoles)(user).some(role => ['admin', 'lab', 'hospital'].includes(role)))
            throw new common_1.ForbiddenException();
        const q = {};
        if (user.role !== 'admin')
            q.provider_account_id = user.id;
        if (status)
            q.state = status;
        return this.bkgModel.find(q, { _id: 0, __v: 0 }).sort({ scheduled_at: 1 }).limit(200);
    }
    async assignTechnician(id, user, body) {
        if (!(0, auth_guard_1.getEffectiveRoles)(user).some(role => ['admin', 'lab', 'hospital'].includes(role)))
            throw new common_1.ForbiddenException();
        const b = await this.bkgModel.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException();
        if (user.role !== 'admin' && b.provider_account_id && b.provider_account_id !== user.id)
            throw new common_1.ForbiddenException();
        b.technician_id = body.technician_id || user.id;
        if (body.notes)
            b.notes = body.notes;
        await b.save();
        this.events.emit('lab.technician_assigned', { booking_id: b.id, patient_id: b.patient_id, technician_id: b.technician_id });
        return b.toObject();
    }
    async uploadReport(id, user, body) {
        if (!(0, auth_guard_1.getEffectiveRoles)(user).some(role => ['admin', 'lab', 'hospital'].includes(role)))
            throw new common_1.ForbiddenException();
        const b = await this.bkgModel.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException();
        if (user.role !== 'admin' && b.provider_account_id && b.provider_account_id !== user.id)
            throw new common_1.ForbiddenException();
        if (!body?.base64 && !body?.url && !body?.structuredData)
            throw new common_1.BadRequestException('report_file_required');
        const reportable = [lab_schema_1.LabBookingState.RESULT_UPLOADED, lab_schema_1.LabBookingState.REPORTED];
        if (!reportable.includes(b.state)) {
            throw new common_1.BadRequestException(`invalid_transition_${b.state}_to_REPORTED`);
        }
        let base64Data = body.base64;
        let mimeType = body.mime || 'application/pdf';
        if (body.structuredData && body.structuredData.length > 0) {
            base64Data = await this.pdfService.generateReport(b, body.structuredData);
            base64Data = base64Data.split(',')[1];
            mimeType = 'application/pdf';
        }
        const report = {
            id: require('uuid').v4(),
            name: body.name || `report_${new Date().toISOString().slice(0, 10)}.pdf`,
            mime: mimeType,
            base64: base64Data,
            url: body.url,
            notes: body.notes,
            uploaded_at: new Date(),
            uploaded_by: user.id,
        };
        const persist = async () => {
            b.reports.push(report);
            if (b.state !== lab_schema_1.LabBookingState.REPORTED) {
                b.state_history.push({ from: b.state, to: lab_schema_1.LabBookingState.REPORTED, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'report_uploaded' });
                b.state = lab_schema_1.LabBookingState.REPORTED;
            }
            await b.save();
            this.events.emit('lab.report_uploaded', { booking_id: b.id, patient_id: b.patient_id, report_id: report.id, name: report.name });
            return b.toObject();
        };
        if (b.state === lab_schema_1.LabBookingState.REPORTED)
            return persist();
        return this.engine.apply({
            kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: lab_schema_1.LabBookingState.REPORTED,
            actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: 'report_uploaded', mutate: persist,
        });
    }
    async adminListAll(filter) {
        const q = {};
        if (filter.status)
            q.state = filter.status;
        if (filter.insurance_status)
            q.insurance_status = filter.insurance_status;
        if (filter.location_type)
            q.location_type = filter.location_type;
        if (filter.delayed_only === 'true') {
            const hoursAgo = new Date();
            hoursAgo.setHours(hoursAgo.getHours() - 24);
            q.createdAt = { $lt: hoursAgo };
            q.state = { $nin: [lab_schema_1.LabBookingState.REPORTED, lab_schema_1.LabBookingState.CANCELLED] };
        }
        return this.bkgModel.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(Math.min(filter.limit || 200, 500));
    }
    async registerSample(user, body) {
        if (!(0, auth_guard_1.getEffectiveRoles)(user).some(role => ['admin', 'lab', 'hospital'].includes(role)))
            throw new common_1.ForbiddenException();
        const b = await this.bkgModel.findOne({ id: body.lab_order_id });
        if (!b)
            throw new common_1.NotFoundException('lab_order_not_found');
        this.assertBookingOwner(user, b);
        const existing = await this.sampleModel.findOne({ barcode: body.barcode });
        if (existing)
            throw new common_1.BadRequestException('barcode_already_registered');
        const persist = async () => {
            const sample = await this.sampleModel.create({
                id: require('uuid').v4(), lab_order_id: body.lab_order_id, patient_id: b.patient_id,
                barcode: body.barcode, tests: body.tests || [], stage: 'received', assigned_to: user.id, notes: body.notes,
            });
            if (b.state !== lab_schema_1.LabBookingState.SAMPLE_COLLECTED) {
                b.state_history.push({ from: b.state, to: lab_schema_1.LabBookingState.SAMPLE_COLLECTED, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'sample_registered' });
                b.state = lab_schema_1.LabBookingState.SAMPLE_COLLECTED;
                await b.save();
            }
            return sample;
        };
        if (b.state === lab_schema_1.LabBookingState.SAMPLE_COLLECTED)
            return persist();
        if (![lab_schema_1.LabBookingState.CONFIRMED, lab_schema_1.LabBookingState.IN_TRANSIT, lab_schema_1.LabBookingState.IN_LAB].includes(b.state)) {
            throw new common_1.BadRequestException(`invalid_transition_${b.state}_to_SAMPLE_COLLECTED`);
        }
        return this.engine.apply({
            kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: lab_schema_1.LabBookingState.SAMPLE_COLLECTED,
            actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: 'sample_registered', mutate: persist,
        });
    }
    async updateSampleStage(user, sampleId, stage, notes) {
        if (!(0, auth_guard_1.getEffectiveRoles)(user).some(role => ['admin', 'lab', 'hospital'].includes(role)))
            throw new common_1.ForbiddenException();
        const sample = await this.sampleModel.findOne({ id: sampleId });
        if (!sample)
            throw new common_1.NotFoundException('sample_not_found');
        const b = await this.bkgModel.findOne({ id: sample.lab_order_id });
        if (!b)
            throw new common_1.NotFoundException('lab_order_not_found');
        this.assertBookingOwner(user, b);
        const allowedSampleStages = {
            received: ['analyzing'], analyzing: ['result_ready'], result_ready: ['sent'], sent: [],
        };
        if (sample.stage !== stage && !(allowedSampleStages[sample.stage] || []).includes(stage)) {
            throw new common_1.BadRequestException(`invalid_sample_transition_${sample.stage}_to_${stage}`);
        }
        const targetBookingState = stage === 'analyzing' ? lab_schema_1.LabBookingState.PROCESSING
            : stage === 'result_ready' ? lab_schema_1.LabBookingState.RESULT_UPLOADED : null;
        if (stage === 'sent' && b.state !== lab_schema_1.LabBookingState.REPORTED)
            throw new common_1.BadRequestException('sample_cannot_be_sent_before_reported');
        const persist = async () => {
            await this.sampleModel.updateOne({ id: sampleId }, { $set: { stage, notes } });
            if (targetBookingState && b.state !== targetBookingState) {
                b.state_history.push({ from: b.state, to: targetBookingState, by_user_id: user.id, by_role: user.role, at: new Date(), note: `sample_stage_${stage}` });
                b.state = targetBookingState;
                await b.save();
            }
            return { ok: true, stage };
        };
        if (!targetBookingState || b.state === targetBookingState)
            return persist();
        const allowed = lab_schema_1.LAB_BOOKING_TRANSITIONS[b.state] || [];
        if (!allowed.includes(targetBookingState))
            throw new common_1.BadRequestException(`invalid_transition_${b.state}_to_${targetBookingState}`);
        return this.engine.apply({
            kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: targetBookingState,
            actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: `sample_stage_${stage}`, mutate: persist,
        });
    }
    async listSamples(user) {
        if (!(0, auth_guard_1.getEffectiveRoles)(user).some(role => ['admin', 'lab', 'hospital'].includes(role)))
            throw new common_1.ForbiddenException();
        if ((0, auth_guard_1.getEffectiveRoles)(user).includes('admin'))
            return this.sampleModel.find({}).sort({ createdAt: -1 }).lean();
        const bookings = await this.bkgModel.find({ provider_account_id: user.id }, { id: 1 }).lean();
        const bookingIds = bookings.map((booking) => booking.id).filter(Boolean);
        if (!bookingIds.length)
            return [];
        return this.sampleModel.find({ lab_order_id: { $in: bookingIds } }).sort({ createdAt: -1 }).lean();
    }
    assertAssignedProviderOrAdmin(user, booking) {
        if ((0, auth_guard_1.getEffectiveRoles)(user).includes('admin'))
            return;
        const providerRoles = ['lab', 'hospital'];
        if (providerRoles.some(role => (0, auth_guard_1.getEffectiveRoles)(user).includes(role)) && booking.provider_account_id === user.id)
            return;
        throw new common_1.ForbiddenException('lab_booking_not_owned');
    }
    assertPatientOrAssignedProvider(user, booking) {
        if ((0, auth_guard_1.getEffectiveRoles)(user).includes('admin'))
            return;
        if (booking.patient_id === user.id)
            return;
        this.assertAssignedProviderOrAdmin(user, booking);
    }
    assertBookingOwner(user, booking) {
        if ((0, auth_guard_1.getEffectiveRoles)(user).includes('admin'))
            return;
        if (!booking.provider_account_id || booking.provider_account_id !== user.id) {
            throw new common_1.ForbiddenException('lab_booking_not_owned');
        }
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
        const b = await this.bkgModel.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException();
        b.state_history.push({ from: b.state, to: targetState, by_user_id: user.id, by_role: user.role, at: new Date(), note: `admin_forced: ${note}` });
        b.state = targetState;
        await b.save();
        return b;
    }
    async rescheduleBooking(id, user, body) {
        const b = await this.bkgModel.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException('Booking not found');
        this.assertPatientOrAssignedProvider(user, b);
        b.scheduled_at = new Date(body.new_date);
        b.reschedule_reason = body.reason;
        b.state_history.push({ from: b.state, to: b.state, by_user_id: user.id, by_role: user.role, at: new Date(), note: `Rescheduled to ${b.scheduled_at}. Reason: ${body.reason}` });
        await b.save();
        return b;
    }
    async updateGps(id, user, body) {
        const b = await this.bkgModel.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException('Booking not found');
        this.assertAssignedProviderOrAdmin(user, b);
        b.gps_location = {
            lat: body.lat || 0,
            lng: body.lng || 0,
            eta: body.eta || 0,
            distance: body.distance || 0
        };
        await b.save();
        return { ok: true, gps: b.gps_location };
    }
    async getTracking(id, user) {
        const b = await this.bkgModel.findOne({ id }).lean();
        if (!b)
            throw new common_1.NotFoundException('Booking not found');
        this.assertPatientOrAssignedProvider(user, b);
        const steps = b.state_history.map((h) => ({
            title: `State changed to ${h.to}`,
            time: new Date(h.at).toLocaleTimeString(),
            done: true,
            icon: 'check'
        }));
        return {
            eta: b.gps_location?.eta || 0,
            distance: b.gps_location?.distance || 0,
            techName: b.technician_id || 'Unknown',
            steps: steps
        };
    }
    async declareEmergency(id, user, body) {
        const b = await this.bkgModel.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException('Booking not found');
        this.assertPatientOrAssignedProvider(user, b);
        if ([lab_schema_1.LabBookingState.REPORTED, lab_schema_1.LabBookingState.CANCELLED].includes(b.state)) {
            throw new common_1.BadRequestException('booking_already_closed');
        }
        b.emergency_reason = body.reason;
        b.state_history.push({ from: b.state, to: lab_schema_1.LabBookingState.CANCELLED, by_user_id: user.id, by_role: user.role, at: new Date(), note: `Emergency declared: ${body.reason}` });
        b.state = lab_schema_1.LabBookingState.CANCELLED;
        await b.save();
        return b;
    }
    async reassign(id, user) {
        if (!(0, auth_guard_1.getEffectiveRoles)(user).some(role => ['admin', 'lab', 'hospital'].includes(role)))
            throw new common_1.ForbiddenException();
        const b = await this.bkgModel.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException('Booking not found');
        if (user.role !== 'admin' && b.provider_account_id && b.provider_account_id !== user.id)
            throw new common_1.ForbiddenException();
        if ([lab_schema_1.LabBookingState.CANCELLED, lab_schema_1.LabBookingState.REPORTED].includes(b.state)) {
            throw new common_1.BadRequestException('booking_already_closed');
        }
        const prevTech = b.technician_id || null;
        b.technician_id = undefined;
        b.state_history.push({ from: b.state, to: lab_schema_1.LabBookingState.CONFIRMED, by_user_id: user.id, by_role: user.role, at: new Date(), note: `reassigned: technician ${prevTech || 'none'} unassigned, returned to pool` });
        b.state = lab_schema_1.LabBookingState.CONFIRMED;
        await b.save();
        this.events.emit('lab.booking_reassigned', { booking_id: b.id, patient_id: b.patient_id, previous_technician_id: prevTech });
        return b.toObject();
    }
};
exports.LabsService = LabsService;
exports.LabsService = LabsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('LabServiceRepository')),
    __param(1, (0, common_1.Inject)('LabBookingRepository')),
    __param(2, (0, common_1.Inject)('LabSampleRepository')),
    __param(3, (0, mongoose_1.InjectModel)(provider_profile_schema_1.ProviderProfile.name)),
    __metadata("design:paramtypes", [labservice_repository_1.LabServiceRepository,
        labbooking_repository_1.LabBookingRepository,
        labsample_repository_1.LabSampleRepository,
        mongoose_2.Model,
        event_emitter_1.EventEmitter2,
        event_bus_service_1.EventBusService,
        workflow_engine_module_1.WorkflowEngineService,
        lab_pdf_service_1.LabPdfService])
], LabsService);
//# sourceMappingURL=labs.service.js.map