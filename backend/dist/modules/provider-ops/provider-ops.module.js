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
exports.ProviderOpsModule = exports.ProviderCompatController = exports.ProviderOpsController = exports.ProviderOpsService = exports.ProviderWithdrawalSchema = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
exports.ProviderWithdrawalSchema = new mongoose_2.Schema({
    id: { type: String, index: true, unique: true },
    provider_id: { type: String, index: true },
    amount: Number,
    state: { type: String, default: 'PENDING_ADMIN_APPROVAL', index: true },
    iban: String,
    bank_name: String,
    reference: String,
    decided_by: String,
    decided_at: Date,
    reject_reason: String,
}, { timestamps: true, collection: 'providerwithdrawals', strict: false });
let ProviderOpsService = class ProviderOpsService {
    constructor(conn) {
        this.conn = conn;
    }
    async addLeave(doctorId, body) {
        if (!body?.start_date || !body?.end_date)
            throw new common_1.BadRequestException('start_date and end_date required');
        const start = new Date(body.start_date);
        const end = new Date(body.end_date);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start)
            throw new common_1.BadRequestException('invalid date range');
        const doc = {
            id: `leave_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            doctor_id: doctorId,
            start_date: start,
            end_date: end,
            type: ['vacation', 'leave', 'break', 'emergency_closing'].includes(body.type) ? body.type : 'leave',
            note: body.note || null,
            status: 'active',
            createdAt: new Date(),
        };
        await this.conn.collection('doctor_leaves').insertOne(doc);
        return { ok: true, leave: doc };
    }
    async myLeaves(doctorId) {
        return this.conn.collection('doctor_leaves').find({ doctor_id: doctorId, status: 'active' }).sort({ start_date: 1 }).limit(50).toArray();
    }
    async cancelLeave(doctorId, leaveId) {
        await this.conn.collection('doctor_leaves').updateOne({ id: leaveId, doctor_id: doctorId }, { $set: { status: 'cancelled', updatedAt: new Date() } });
        return { ok: true };
    }
    async isOnLeave(doctorId, when) {
        const hit = await this.conn.collection('doctor_leaves').findOne({
            doctor_id: doctorId,
            status: 'active',
            start_date: { $lte: when },
            end_date: { $gte: when },
        });
        return !!hit;
    }
    async saveTemplate(doctorId, body) {
        if (!body?.name || !Array.isArray(body?.items) || !body.items.length)
            throw new common_1.BadRequestException('name and items required');
        const doc = { id: `tpl_${Date.now()}`, doctor_id: doctorId, name: body.name, items: body.items, notes: body.notes || null, usage_count: 0, createdAt: new Date() };
        await this.conn.collection('prescription_templates').insertOne(doc);
        return { ok: true, template: doc };
    }
    async myTemplates(doctorId) {
        return this.conn.collection('prescription_templates').find({ doctor_id: doctorId }).sort({ usage_count: -1, createdAt: -1 }).limit(50).toArray();
    }
    async deleteTemplate(doctorId, id) {
        await this.conn.collection('prescription_templates').deleteOne({ id, doctor_id: doctorId });
        return { ok: true };
    }
    async saveDiagnosis(doctorId, body) {
        if (!body?.name_ar)
            throw new common_1.BadRequestException('name_ar required');
        const doc = { id: `dx_${Date.now()}`, doctor_id: doctorId, ...body, usage_count: 0, createdAt: new Date() };
        await this.conn.collection('saved_diagnoses').insertOne(doc);
        return { ok: true, diagnosis: doc };
    }
    async myDiagnoses(doctorId, search) {
        const q = { doctor_id: doctorId };
        if (search)
            q.$or = [{ name_ar: { $regex: search, $options: 'i' } }, { name_en: { $regex: search, $options: 'i' } }];
        return this.conn.collection('saved_diagnoses').find(q).sort({ usage_count: -1 }).limit(50).toArray();
    }
    async blacklistPatient(doctorId, patientId, reason) {
        if (!patientId)
            throw new common_1.BadRequestException('patient_id required');
        await this.conn.collection('doctor_blacklist').updateOne({ doctor_id: doctorId, patient_id: patientId }, { $set: { doctor_id: doctorId, patient_id: patientId, reason: reason || null, active: true, createdAt: new Date() } }, { upsert: true });
        return { ok: true, blacklisted: true };
    }
    async unblacklistPatient(doctorId, patientId) {
        await this.conn.collection('doctor_blacklist').updateOne({ doctor_id: doctorId, patient_id: patientId }, { $set: { active: false, updatedAt: new Date() } });
        return { ok: true };
    }
    async myBlacklist(doctorId) {
        return this.conn.collection('doctor_blacklist').find({ doctor_id: doctorId, active: true }, { projection: { _id: 0 } }).toArray();
    }
    async getPatientCrm(doctorId, patientId) {
        const doc = await this.conn.collection('doctor_patient_crm').findOne({ doctor_id: doctorId, patient_id: patientId }, { projection: { _id: 0 } });
        return doc?.data || { tags: [], notes: [], vip: false, favorite: false };
    }
    async putPatientCrm(doctorId, patientId, data) {
        const clean = {
            tags: Array.isArray(data?.tags) ? data.tags.slice(0, 50).map((t) => String(t).slice(0, 60)) : [],
            notes: Array.isArray(data?.notes)
                ? data.notes.slice(0, 200).map((n) => ({
                    id: String(n?.id || `n_${Date.now()}`),
                    date: String(n?.date || new Date().toISOString().slice(0, 10)),
                    text: String(n?.text || '').slice(0, 2000),
                })).filter((n) => n.text)
                : [],
            vip: !!data?.vip,
            favorite: !!data?.favorite,
        };
        await this.conn.collection('doctor_patient_crm').updateOne({ doctor_id: doctorId, patient_id: patientId }, {
            $set: { data: clean, updatedAt: new Date() },
            $setOnInsert: { id: `crm_${Date.now()}`, doctor_id: doctorId, patient_id: patientId, createdAt: new Date() },
        }, { upsert: true });
        return clean;
    }
    async isBlacklisted(doctorId, patientId) {
        return !!(await this.conn.collection('doctor_blacklist').findOne({ doctor_id: doctorId, patient_id: patientId, active: true }));
    }
    async labQc(user, bookingId, action, body = {}) {
        const allowed = ['sample_rejected', 'recollect_requested', 'mark_urgent', 'mark_stat', 'critical_value', 'verify', 'double_verify'];
        if (!allowed.includes(action))
            throw new common_1.BadRequestException(`action must be one of ${allowed.join(',')}`);
        const b = await this.conn.collection('labbookings').findOne({ id: bookingId });
        if (!b)
            throw new common_1.NotFoundException('booking not found');
        const patch = { updatedAt: new Date() };
        const hist = { action, at: new Date(), by: user.id, role: user.role, note: body?.note || null };
        switch (action) {
            case 'sample_rejected':
                patch.sample_state = 'rejected';
                patch.sample_reject_reason = body?.reason || 'unsuitable_sample';
                break;
            case 'recollect_requested':
                patch.sample_state = 'recollect_requested';
                patch.state = 'RESCHEDULED';
                break;
            case 'mark_urgent':
                patch.priority = 'urgent';
                break;
            case 'mark_stat':
                patch.priority = 'stat';
                break;
            case 'critical_value':
                patch.critical_value = true;
                patch.critical_note = body?.note || null;
                await this.notifyUser(b.patient_id, 'نتيجة حرجة من المختبر', 'نتيجة تحليلك تحتاج مراجعة عاجلة — تواصل مع طبيبك.', { booking_id: bookingId, critical: true });
                if (b.doctor_id)
                    await this.notifyUser(b.doctor_id, 'نتيجة حرجة لمريضك', `قيمة حرجة في الحجز ${bookingId}: ${body?.note || ''}`, { booking_id: bookingId, critical: true });
                break;
            case 'verify':
                patch.verified_by = user.id;
                patch.verified_at = new Date();
                patch.verification_state = 'verified';
                break;
            case 'double_verify':
                if (!b.verified_by)
                    throw new common_1.BadRequestException('first verification required before double verification');
                patch.double_verified_by = user.id;
                patch.double_verified_at = new Date();
                patch.verification_state = 'double_verified';
                break;
        }
        await this.conn.collection('labbookings').updateOne({ id: bookingId }, { $set: patch, $push: { qc_history: hist } });
        if (action === 'double_verify') {
            const fee = Number(b.price ?? b.amount ?? b.total ?? 0);
            const labId = b.lab_id || b.provider_id || user.id;
            await this.creditEarning(labId, 'lab', fee, 'lab_booking', bookingId);
        }
        return { ok: true, action, booking_id: bookingId, state: patch.state || b.state, priority: patch.priority || b.priority };
    }
    async notifyUser(userId, title, body, data) {
        if (!userId)
            return;
        await this.conn.collection('notifications').insertOne({
            id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            user_id: userId, title_key: title, body_key: body,
            type: 'alert', priority: 'critical', is_read: false, data,
            createdAt: new Date(), updatedAt: new Date(),
        }).catch(() => { });
    }
    async nursingChecklist(user, bookingId, phase, items) {
        if (!['before', 'supplies', 'after'].includes(phase))
            throw new common_1.BadRequestException('phase must be before|supplies|after');
        await this.conn.collection('homecarebookings').updateOne({ id: bookingId }, { $set: { [`checklists.${phase}`]: { items, completed_at: new Date(), by: user.id }, updatedAt: new Date() } });
        return { ok: true, phase, completed: Object.values(items).filter(Boolean).length, total: Object.keys(items).length };
    }
    async nursingSign(user, bookingId, signatureBase64, signerName) {
        if (!signatureBase64 || signatureBase64.length < 100)
            throw new common_1.BadRequestException('signature required');
        if (!signerName?.trim())
            throw new common_1.BadRequestException('signer name required');
        await this.conn.collection('homecarebookings').updateOne({ id: bookingId }, {
            $set: {
                patient_signature: { data_base64: signatureBase64.slice(0, 300000), signer_name: signerName.trim(), signed_at: new Date(), sha256: require('crypto').createHash('sha256').update(signatureBase64).digest('hex') },
                state: 'COMPLETED',
                completed_at: new Date(),
                updatedAt: new Date(),
            },
        });
        const bk = await this.conn.collection('homecarebookings').findOne({ id: bookingId });
        const fee = Number(bk?.price ?? bk?.amount ?? bk?.total ?? 0);
        await this.creditEarning(user.id, 'nursing', fee, 'homecare_booking', bookingId);
        return { ok: true, signed: true, signer: signerName.trim(), state: 'COMPLETED' };
    }
    async nursingTrack(user, bookingId, lat, lng) {
        if (typeof lat !== 'number' || typeof lng !== 'number')
            throw new common_1.BadRequestException('lat/lng required');
        await this.conn.collection('homecarebookings').updateOne({ id: bookingId }, { $push: { track_points: { lat, lng, at: new Date(), by: user.id } }, $set: { updatedAt: new Date() } });
        return { ok: true };
    }
    async nursingEscalate(user, bookingId, reason) {
        if (!reason?.trim())
            throw new common_1.BadRequestException('reason required');
        await this.conn.collection('homecarebookings').updateOne({ id: bookingId }, { $set: { emergency_escalation: { reason, by: user.id, at: new Date() }, state: 'ESCALATED', updatedAt: new Date() } });
        await this.conn.collection('notifications').insertOne({
            id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            role: 'admin', title_key: 'تصعيد طارئ من زيارة تمريض',
            body_key: `الزيارة ${bookingId}: ${reason}`, type: 'alert', priority: 'critical', is_read: false,
            data: { booking_id: bookingId, reason }, createdAt: new Date(), updatedAt: new Date(),
        }).catch(() => { });
        return { ok: true, escalated: true };
    }
    async ownedAmbulanceMission(user, bookingId) {
        const role = String(user?.role || '').toLowerCase();
        const admin = role === 'admin' || role === 'super_admin';
        if (!user?.id || (!admin && !['ambulance', 'paramedic', 'ems'].includes(role)))
            throw new common_1.ForbiddenException('ambulance_provider_role_required');
        if (!admin) {
            const account = await this.conn.collection('provider_accounts').findOne({
                id: user.id, provider_type: { $in: ['ambulance', 'ems'] }, status: { $in: ['approved', 'active'] },
            });
            if (!account)
                throw new common_1.ForbiddenException('approved_ambulance_account_required');
        }
        const mission = await this.conn.collection('emergency_requests').findOne({ id: bookingId });
        if (!mission)
            throw new common_1.NotFoundException('emergency_not_found');
        if (!admin && String(mission.assigned_ambulance_id || '') !== String(user.id))
            throw new common_1.ForbiddenException('mission_not_assigned_to_ambulance');
        return mission;
    }
    async ambulanceEta(user, bookingId, fromLat, fromLng) {
        if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng) || fromLat < -90 || fromLat > 90 || fromLng < -180 || fromLng > 180)
            throw new common_1.BadRequestException('valid_current_location_required');
        const b = await this.ownedAmbulanceMission(user, bookingId);
        const dest = b.location || b.patient_location;
        if (!dest?.lat)
            return { eta_minutes: null, note: 'no destination coordinates' };
        const R = 6371;
        const dLat = (dest.lat - fromLat) * Math.PI / 180;
        const dLng = (dest.lng - fromLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(fromLat * Math.PI / 180) * Math.cos(dest.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const km = 2 * R * Math.asin(Math.sqrt(a));
        const eta = Math.max(1, Math.round((km / 40) * 60));
        return { eta_minutes: eta, distance_km: Math.round(km * 10) / 10 };
    }
    async ambulanceHandover(user, bookingId, body) {
        const mission = await this.ownedAmbulanceMission(user, bookingId);
        if (!['DISPATCHED', 'IN_TRANSIT', 'ON_SCENE', 'AT_HOSPITAL'].includes(String(mission.state)))
            throw new common_1.BadRequestException(`invalid_mission_state:${mission.state}`);
        const hospitalId = String(body?.hospital_provider_account_id || '').trim();
        if (!hospitalId)
            throw new common_1.BadRequestException('hospital_provider_account_id_required');
        const hospital = await this.conn.collection('provider_accounts').findOne({ id: hospitalId, provider_type: { $in: ['hospital', 'facility'] }, status: { $in: ['approved', 'active'] } });
        if (!hospital)
            throw new common_1.BadRequestException('receiving_hospital_not_approved');
        const now = new Date();
        const handover = { hospital_provider_account_id: hospitalId, notes: String(body?.notes || '').trim() || null, by: user.id, at: now, mission_state_before: mission.state };
        const update = await this.conn.collection('emergency_requests').updateOne({ id: bookingId, state: mission.state }, { $set: { handover, state: 'HANDED_OVER', updatedAt: now }, $push: { state_history: { from: mission.state, to: 'HANDED_OVER', by_user_id: user.id, at: now, reason: 'hospital_handover' } } });
        if (update.modifiedCount !== 1)
            throw new common_1.BadRequestException('mission_transition_conflict');
        await this.conn.collection('audit_logs').insertOne({ id: `ambulance_handover_${bookingId}_${now.getTime()}`, action: 'ambulance_handover', resource_kind: 'emergency_request', resource_id: bookingId, actor_account_id: user.id, purpose: 'clinical_handover', metadata: { hospital_provider_account_id: hospitalId }, createdAt: now });
        return { ok: true, state: 'HANDED_OVER', handover_reference: `handover:${bookingId}:${now.getTime()}` };
    }
    async ambulanceComplete(user, bookingId, body) {
        const mission = await this.ownedAmbulanceMission(user, bookingId);
        if (mission.state !== 'HANDED_OVER')
            throw new common_1.BadRequestException(`invalid_mission_state:${mission.state}`);
        if (!body?.summary || !body?.outcome)
            throw new common_1.BadRequestException('summary_and_outcome_required');
        const now = new Date();
        const update = await this.conn.collection('emergency_requests').updateOne({ id: bookingId, state: 'HANDED_OVER' }, { $set: { completion_report: { summary: String(body.summary).trim(), outcome: String(body.outcome).trim(), vitals: body.vitals || {}, by: user.id, at: now }, state: 'COMPLETED', updatedAt: now }, $push: { state_history: { from: 'HANDED_OVER', to: 'COMPLETED', by_user_id: user.id, at: now, reason: 'mission_completion' } } });
        if (update.modifiedCount !== 1)
            throw new common_1.BadRequestException('mission_transition_conflict');
        const fare = Number(mission.fare ?? mission.amount ?? 0);
        if (!Number.isFinite(fare) || fare < 0)
            throw new common_1.BadRequestException('server_fare_required');
        await this.creditEarning(mission.assigned_ambulance_id, 'ambulance', fare, 'emergency', bookingId);
        await this.conn.collection('audit_logs').insertOne({ id: `ambulance_complete_${bookingId}_${now.getTime()}`, action: 'ambulance_complete', resource_kind: 'emergency_request', resource_id: bookingId, actor_account_id: user.id, purpose: 'clinical_mission_completion', createdAt: now });
        return { ok: true, state: 'COMPLETED' };
    }
    async invoicePdf(orderId, requester) {
        const o = await this.conn.collection('orders').findOne({ id: orderId });
        if (!o)
            throw new common_1.NotFoundException('order not found');
        if (o.patient_id !== requester.id && requester.role !== 'admin' && o.pharmacy_id !== requester.id)
            throw new common_1.BadRequestException('forbidden');
        const svc = new (require('../legal/legal-enterprise.service').LegalEnterpriseService)(this.conn);
        const total = o.total ?? o.totals?.total ?? 0;
        const pdf = svc.buildPdf(`Invoice ${o.id}`, [
            `Date: ${new Date(o.createdAt).toISOString().slice(0, 10)}`,
            `Order: ${o.id}`,
            `Patient: ${o.patient_id}`,
            `State: ${o.state || o.status}`,
            `Total: ${total} SAR`,
            `Commission: ${o.commission ?? 'platform rate'} · VAT 15% on commission`,
            '',
            ...(Array.isArray(o.items) ? o.items : []).slice(0, 30).map((i) => `- ${i.name_ar || i.name || i.medicine_id} ×${i.qty || 1} = ${i.price || 0} SAR`),
        ]);
        return pdf;
    }
    async toggleInstantAvailability(user) {
        const providerId = typeof user?.id === 'string' ? user.id.trim() : '';
        const providerType = user?.provider_type || user?.providerType;
        const providerRoles = ['doctor', 'facility', 'hospital', 'pharmacy', 'pharmacist', 'lab', 'radiology', 'nursing', 'nurse', 'home_care', 'ambulance'];
        if (!providerId)
            throw new common_1.BadRequestException('provider_id_required');
        if (!providerType && !providerRoles.includes(String(user?.role || '').toLowerCase())) {
            throw new common_1.ForbiddenException('provider_account_required');
        }
        const collection = this.conn.collection('provideravailability');
        const existing = await collection.findOne({ provider_id: providerId });
        const instantAvailable = !(existing?.instant_available === true);
        await collection.updateOne({ provider_id: providerId }, {
            $set: {
                provider_id: providerId,
                provider_type: providerType || user?.role || null,
                instant_available: instantAvailable,
                updatedAt: new Date(),
            },
            $setOnInsert: { id: `availability_${providerId}`, createdAt: new Date() },
        }, { upsert: true });
        return { instant_available: instantAvailable };
    }
    async statsToday(providerId) {
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const sources = ['doctor_appointments', 'labbookings', 'homecarebookings', 'radiologybookings', 'orders'];
        const idFields = ['doctor_id', 'lab_id', 'provider_id', 'nurse_id', 'radiology_id', 'pharmacy_id'];
        let todayCount = 0, pendingCount = 0;
        for (const coll of sources) {
            try {
                const orConds = idFields.map(f => ({ [f]: providerId, createdAt: { $gte: dayStart } }));
                todayCount += await this.conn.collection(coll).countDocuments({ $or: orConds });
                const pendOr = idFields.map(f => ({ [f]: providerId, state: { $in: ['NEW_REQUEST', 'NEW', 'PENDING', 'REQUESTED', 'BROADCAST'] } }));
                pendingCount += await this.conn.collection(coll).countDocuments({ $or: pendOr });
            }
            catch { }
        }
        const ledger = await this.walletLedger(providerId, 500);
        const revenue = ledger.transactions
            .filter((t) => t.type === 'provider_earning' && new Date(t.createdAt) >= dayStart)
            .reduce((s, t) => s + (t.amount || 0), 0);
        return { todayCount, revenue, pendingCount };
    }
    async statsPeriod(providerId, period) {
        const now = new Date();
        const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
        const rangeStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const bucketCount = period === 'week' ? 7 : 12;
        const bucketMs = (days * 24 * 60 * 60 * 1000) / bucketCount;
        const sources = [
            { coll: 'doctor_appointments', label: 'consultation' },
            { coll: 'labbookings', label: 'lab' },
            { coll: 'homecarebookings', label: 'home_care' },
            { coll: 'radiologybookings', label: 'radiology' },
        ];
        const idFields = ['doctor_id', 'lab_id', 'provider_id', 'nurse_id', 'radiology_id', 'pharmacy_id', 'account_id'];
        let appointments = 0;
        const perService = {};
        const patientIds = new Set();
        for (const src of sources) {
            try {
                const rows = await this.conn.collection(src.coll)
                    .find({ $or: idFields.map((f) => ({ [f]: providerId })), createdAt: { $gte: rangeStart } })
                    .project({ patient_id: 1, user_id: 1, createdAt: 1 }).toArray();
                perService[src.label] = rows.length;
                appointments += rows.length;
                rows.forEach((r) => { const pid = r.patient_id || r.user_id; if (pid)
                    patientIds.add(String(pid)); });
            }
            catch { }
        }
        let newPatients = 0;
        for (const pid of patientIds) {
            let first = null;
            for (const src of sources) {
                try {
                    const row = await this.conn.collection(src.coll)
                        .find({ $or: idFields.map((f) => ({ [f]: providerId })), $and: [{ $or: [{ patient_id: pid }, { user_id: pid }] }] })
                        .sort({ createdAt: 1 }).limit(1).next();
                    if (row && (!first || new Date(row.createdAt) < new Date(first.createdAt)))
                        first = row;
                }
                catch { }
            }
            if (first && new Date(first.createdAt) >= rangeStart)
                newPatients++;
        }
        const ledger = await this.walletLedger(providerId, 1000);
        const inRange = ledger.transactions.filter((t) => t.type === 'provider_earning' && new Date(t.createdAt) >= rangeStart);
        const revenue = inRange.reduce((sum, t) => sum + (t.amount || 0), 0);
        const series = new Array(bucketCount).fill(0);
        for (const t of inRange) {
            const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((new Date(t.createdAt).getTime() - rangeStart.getTime()) / bucketMs)));
            series[idx] += Math.round((t.amount || 0) * 100) / 100;
        }
        const ratingRows = await this.conn.collection('ratings')
            .find({ $or: [{ provider_id: providerId }, { entity_id: providerId }], createdAt: { $gte: rangeStart } })
            .project({ rating: 1, value: 1, stars: 1 }).toArray();
        const ratingValues = ratingRows.map((r) => Number(r.rating ?? r.value ?? r.stars)).filter((v) => Number.isFinite(v) && v > 0);
        const rating = ratingValues.length ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10 : null;
        const topService = Object.entries(perService).sort((a, b) => b[1] - a[1])[0];
        const service_breakdown = Object.entries(perService)
            .filter(([, count]) => count > 0)
            .map(([label, count]) => ({ label, count, pct: appointments > 0 ? Math.round((count / appointments) * 100) : 0 }))
            .sort((a, b) => b.count - a.count);
        return {
            period,
            service_breakdown,
            revenue: Math.round(revenue * 100) / 100,
            appointments,
            rating,
            ratings_count: ratingValues.length,
            new_patients: newPatients,
            top_service: topService && topService[1] > 0 ? topService[0] : null,
            series,
            currency: 'SAR',
        };
    }
    async providerReviews(providerId) {
        const rows = await this.conn.collection('ratings')
            .find({ $or: [{ provider_id: providerId }, { entity_id: providerId }] })
            .sort({ createdAt: -1 }).limit(100).toArray();
        return rows.map((r) => ({ ...r, id: r.id || r._id?.toString(), _id: undefined }));
    }
    async replyReview(providerId, ratingId, reply) {
        if (!reply?.trim())
            throw new common_1.BadRequestException('reply required');
        const own = { $or: [{ provider_id: providerId }, { entity_id: providerId }] };
        let r = await this.conn.collection('ratings').updateOne({ id: ratingId, ...own }, { $set: { reply: reply.trim(), reply_at: new Date() } });
        if (!r.matchedCount) {
            try {
                const { Types } = require('mongoose');
                if (Types.ObjectId.isValid(ratingId)) {
                    r = await this.conn.collection('ratings').updateOne({ _id: new Types.ObjectId(ratingId), ...own }, { $set: { reply: reply.trim(), reply_at: new Date() } });
                }
            }
            catch { }
        }
        if (!r.matchedCount)
            throw new common_1.NotFoundException('review not found');
        return { ok: true };
    }
    async getProviderSetting(providerId, key, def) {
        const doc = await this.conn.collection('provider_settings').findOne({ provider_id: providerId });
        return doc?.[key] ?? def;
    }
    async setProviderSetting(providerId, key, value) {
        await this.conn.collection('provider_settings').updateOne({ provider_id: providerId }, { $set: { provider_id: providerId, [key]: value, updatedAt: new Date() } }, { upsert: true });
        return { ok: true };
    }
    async endConsultation(user, body) {
        const appointmentId = body.appointment_id || body.id;
        if (!appointmentId)
            throw new common_1.BadRequestException('appointment_id required');
        const now = new Date();
        const r = await this.conn.collection('doctor_appointments').updateOne({ id: appointmentId }, {
            $set: { state: 'completed', ended_at: now, updatedAt: now },
            $push: { state_history: { from: 'in_consultation', to: 'completed', by: user.id, at: now } },
        });
        if (!r.matchedCount)
            throw new common_1.NotFoundException('appointment not found');
        if (body.notes || body.diagnosis) {
            await this.conn.collection('consultationnotes').insertOne({
                id: `note_${Date.now()}`, appointment_id: appointmentId, doctor_id: user.id,
                notes: body.notes || null, diagnosis: body.diagnosis || null, createdAt: now,
            });
        }
        const appt = await this.conn.collection('doctor_appointments').findOne({ id: appointmentId });
        if (Array.isArray(body.prescription) && body.prescription.length) {
            await this.conn.collection('prescriptions').insertOne({
                id: `rx_${Date.now()}`, appointment_id: appointmentId, doctor_id: user.id,
                patient_id: appt?.patient_id || body.patient_id || null,
                items: body.prescription, state: 'CREATED_BY_DOCTOR', createdAt: now,
            });
        }
        const fee = Number(appt?.price ?? appt?.fee ?? appt?.amount ?? body.amount ?? 0);
        await this.creditEarning(user.id, 'doctor', fee, 'appointment', appointmentId);
        return { ok: true, state: 'completed' };
    }
    async creditEarning(providerId, serviceType, gross, refType, refId) {
        if (!providerId || !gross || gross <= 0)
            return null;
        const dup = await this.conn.collection('platformledgerentries').findOne({ ref_type: refType, ref_id: refId, type: 'provider_earning' });
        if (dup)
            return dup;
        const cfg = await this.conn.collection('finance_config').findOne({ key: 'commissions' });
        const pct = cfg?.service_types?.[serviceType]?.percent ?? 10;
        const vatPct = cfg?.tax?.vat_percent ?? 15;
        const delayDays = cfg?.settlement?.delay_days?.[serviceType] ?? cfg?.settlement?.delay_days?.default ?? 3;
        const commission = Math.round(gross * pct) / 100;
        const vat = Math.round(commission * vatPct) / 100;
        const net = Math.round((gross - commission - vat) * 100) / 100;
        const row = {
            id: `earn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            provider_account_id: providerId,
            type: 'provider_earning', state: 'pending',
            available_at: new Date(Date.now() + delayDays * 24 * 3600 * 1000),
            amount: net, gross, commission_percent: pct, commission, vat,
            ref_type: refType, ref_id: refId, createdAt: new Date(),
        };
        await this.conn.collection('platformledgerentries').insertOne(row);
        return row;
    }
    async walletLedger(providerId, limit = 100) {
        const rows = await this.conn.collection('platformledgerentries').find({ provider_account_id: providerId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(Math.min(limit, 200)).toArray();
        const earned = rows.filter((r) => r.type === 'provider_earning').reduce((s, r) => s + (r.amount || 0), 0);
        const paid = rows.filter((r) => r.type === 'payout').reduce((s, r) => s + (r.amount || 0), 0);
        const pending = rows.filter((r) => r.state === 'pending').reduce((s, r) => s + (r.amount || 0), 0);
        return {
            transactions: rows,
            summary: { earned, paid, pending, balance: Math.max(0, earned - paid) },
        };
    }
};
exports.ProviderOpsService = ProviderOpsService;
exports.ProviderOpsService = ProviderOpsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], ProviderOpsService);
let ProviderOpsController = class ProviderOpsController {
    constructor(svc) {
        this.svc = svc;
    }
    addLeave(u, b) { return this.svc.addLeave(u.id, b); }
    leaves(u) { return this.svc.myLeaves(u.id); }
    cancelLeave(u, id) { return this.svc.cancelLeave(u.id, id); }
    saveTemplate(u, b) { return this.svc.saveTemplate(u.id, b); }
    templates(u) { return this.svc.myTemplates(u.id); }
    delTemplate(u, id) { return this.svc.deleteTemplate(u.id, id); }
    saveDx(u, b) { return this.svc.saveDiagnosis(u.id, b); }
    diagnoses(u, s) { return this.svc.myDiagnoses(u.id, s); }
    block(u, p, b) { return this.svc.blacklistPatient(u.id, p, b?.reason); }
    unblock(u, p) { return this.svc.unblacklistPatient(u.id, p); }
    blacklist(u) { return this.svc.myBlacklist(u.id); }
    getCrm(u, p) { return this.svc.getPatientCrm(u.id, p); }
    putCrm(u, p, b) { return this.svc.putPatientCrm(u.id, p, b || {}); }
    qc(u, id, action, b) { return this.svc.labQc(u, id, action, b); }
    checklist(u, id, phase, b) { return this.svc.nursingChecklist(u, id, phase, b?.items || {}); }
    sign(u, id, b) { return this.svc.nursingSign(u, id, b?.signature, b?.signer_name); }
    track(u, id, b) { return this.svc.nursingTrack(u, id, b?.lat, b?.lng); }
    escalate(u, id, b) { return this.svc.nursingEscalate(u, id, b?.reason); }
    eta(u, id, lat, lng) { return this.svc.ambulanceEta(u, id, parseFloat(lat), parseFloat(lng)); }
    handover(u, id, b) { return this.svc.ambulanceHandover(u, id, b); }
    complete(u, id, b) { return this.svc.ambulanceComplete(u, id, b); }
    async invoice(u, id, res) {
        const pdf = await this.svc.invoicePdf(id, u);
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="invoice-${id}.pdf"` });
        const { Readable } = require('stream');
        return new common_1.StreamableFile(Readable.from(pdf));
    }
    wallet(u, l) { return this.svc.walletLedger(u.id, l ? parseInt(l) : 100); }
};
exports.ProviderOpsController = ProviderOpsController;
__decorate([
    (0, common_1.Post)('doctor/leave'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "addLeave", null);
__decorate([
    (0, common_1.Get)('doctor/leave'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderOpsController.prototype, "leaves", null);
__decorate([
    (0, common_1.Delete)('doctor/leave/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "cancelLeave", null);
__decorate([
    (0, common_1.Post)('doctor/templates'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "saveTemplate", null);
__decorate([
    (0, common_1.Get)('doctor/templates'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderOpsController.prototype, "templates", null);
__decorate([
    (0, common_1.Delete)('doctor/templates/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "delTemplate", null);
__decorate([
    (0, common_1.Post)('doctor/diagnoses'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "saveDx", null);
__decorate([
    (0, common_1.Get)('doctor/diagnoses'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProviderOpsController.prototype, "diagnoses", null);
__decorate([
    (0, common_1.Post)('doctor/blacklist/:patientId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('patientId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "block", null);
__decorate([
    (0, common_1.Delete)('doctor/blacklist/:patientId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('patientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "unblock", null);
__decorate([
    (0, common_1.Get)('doctor/blacklist'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderOpsController.prototype, "blacklist", null);
__decorate([
    (0, common_1.Get)('doctor/patient-crm/:patientId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('patientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "getCrm", null);
__decorate([
    (0, common_1.Put)('doctor/patient-crm/:patientId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('patientId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "putCrm", null);
__decorate([
    (0, common_1.Post)('lab/bookings/:id/qc/:action'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('action')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "qc", null);
__decorate([
    (0, common_1.Post)('nursing/bookings/:id/checklist/:phase'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('phase')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "checklist", null);
__decorate([
    (0, common_1.Post)('nursing/bookings/:id/sign'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "sign", null);
__decorate([
    (0, common_1.Post)('nursing/bookings/:id/track'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "track", null);
__decorate([
    (0, common_1.Post)('nursing/bookings/:id/escalate'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "escalate", null);
__decorate([
    (0, common_1.Get)('ambulance/:id/eta'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('lat')),
    __param(3, (0, common_1.Query)('lng')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "eta", null);
__decorate([
    (0, common_1.Post)('ambulance/:id/handover'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "handover", null);
__decorate([
    (0, common_1.Post)('ambulance/:id/complete'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderOpsController.prototype, "complete", null);
__decorate([
    (0, common_1.Get)('invoice/:orderId/pdf'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('orderId')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProviderOpsController.prototype, "invoice", null);
__decorate([
    (0, common_1.Get)('wallet/ledger'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProviderOpsController.prototype, "wallet", null);
exports.ProviderOpsController = ProviderOpsController = __decorate([
    (0, common_1.Controller)('provider/ops'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ProviderOpsService])
], ProviderOpsController);
let ProviderCompatController = class ProviderCompatController {
    constructor(svc) {
        this.svc = svc;
    }
    toggleInstantAvailability(u) {
        return this.svc.toggleInstantAvailability(u);
    }
    async wallet(u) {
        const l = await this.svc.walletLedger(u.id, 500);
        return { available: l.summary.balance, escrow: l.summary.pending, dues: l.summary.earned - l.summary.paid - l.summary.pending, earned: l.summary.earned };
    }
    async walletTx(u) {
        const l = await this.svc.walletLedger(u.id, 100);
        return l.transactions.map((t) => ({
            id: t.id || t._id,
            date: (t.createdAt || '').toString().slice(0, 10),
            type: t.type === 'payout' || (t.amount || 0) < 0 ? 'DEBIT' : 'CREDIT',
            amount: Math.abs(t.amount || 0),
            title: t.description || t.title || t.type,
        }));
    }
    async statsToday(u) {
        return this.svc.statsToday(u.id);
    }
    async statsPeriod(u, period) {
        const p = period === 'week' || period === 'year' ? period : 'month';
        return this.svc.statsPeriod(u.id, p);
    }
    async getPricing(u) {
        return { pricing: await this.svc.getProviderSetting(u.id, 'pricing', null) };
    }
    async putPricing(u, b) {
        return this.svc.setProviderSetting(u.id, 'pricing', b?.pricing ?? b);
    }
    async myReviews(u) {
        return this.svc.providerReviews(u.id);
    }
    replyReview(u, id, b) {
        return this.svc.replyReview(u.id, id, b?.reply);
    }
    async getHours(u) {
        return this.svc.getProviderSetting(u.id, 'working_hours', null);
    }
    async putHours(u, b) {
        return this.svc.setProviderSetting(u.id, 'working_hours', b?.hours ?? b);
    }
    async getSched(u) {
        return this.svc.getProviderSetting(u.id, 'schedule_settings', null);
    }
    async postSched(u, b) {
        return this.svc.setProviderSetting(u.id, 'schedule_settings', b || {});
    }
    endConsultation(u, b) {
        return this.svc.endConsultation(u, b || {});
    }
};
exports.ProviderCompatController = ProviderCompatController;
__decorate([
    (0, common_1.Post)('ops/availability/toggle-instant'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderCompatController.prototype, "toggleInstantAvailability", null);
__decorate([
    (0, common_1.Get)('wallet'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderCompatController.prototype, "wallet", null);
__decorate([
    (0, common_1.Get)('wallet/transactions'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderCompatController.prototype, "walletTx", null);
__decorate([
    (0, common_1.Get)('stats/today'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderCompatController.prototype, "statsToday", null);
__decorate([
    (0, common_1.Get)('stats/period'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProviderCompatController.prototype, "statsPeriod", null);
__decorate([
    (0, common_1.Get)('settings/pricing'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderCompatController.prototype, "getPricing", null);
__decorate([
    (0, common_1.Put)('settings/pricing'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProviderCompatController.prototype, "putPricing", null);
__decorate([
    (0, common_1.Get)('reviews'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderCompatController.prototype, "myReviews", null);
__decorate([
    (0, common_1.Post)('reviews/:id/reply'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderCompatController.prototype, "replyReview", null);
__decorate([
    (0, common_1.Get)('working-hours'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderCompatController.prototype, "getHours", null);
__decorate([
    (0, common_1.Put)('working-hours'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProviderCompatController.prototype, "putHours", null);
__decorate([
    (0, common_1.Get)('schedule/settings'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderCompatController.prototype, "getSched", null);
__decorate([
    (0, common_1.Post)('schedule/settings'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProviderCompatController.prototype, "postSched", null);
__decorate([
    (0, common_1.Post)('consultation/end'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderCompatController.prototype, "endConsultation", null);
exports.ProviderCompatController = ProviderCompatController = __decorate([
    (0, common_1.Controller)('provider'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ProviderOpsService])
], ProviderCompatController);
let ProviderOpsModule = class ProviderOpsModule {
};
exports.ProviderOpsModule = ProviderOpsModule;
exports.ProviderOpsModule = ProviderOpsModule = __decorate([
    (0, common_1.Module)({
        controllers: [ProviderOpsController, ProviderCompatController],
        providers: [ProviderOpsService],
        exports: [ProviderOpsService],
    })
], ProviderOpsModule);
//# sourceMappingURL=provider-ops.module.js.map