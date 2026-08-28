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
exports.ProviderProductionModule = exports.ProviderProductionController = exports.ProviderProductionService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const crypto_1 = require("crypto");
const PROVIDER_ROLES = [
    enums_1.UserRole.DOCTOR, enums_1.UserRole.LAB, enums_1.UserRole.RADIOLOGY, enums_1.UserRole.NURSE,
    enums_1.UserRole.PHARMACY, enums_1.UserRole.HOSPITAL, enums_1.UserRole.ADMIN,
];
const ROLE_ALIASES = {
    nursing: 'nurse', nurse: 'nurse',
    laboratory: 'lab', home_care: 'nurse', homecare: 'nurse',
    pharmacist: 'pharmacy', hospital: 'hospital', facility: 'hospital',
};
function assertProviderRole(user) {
    const raw = String(user?.role || '').toLowerCase();
    const normalized = ROLE_ALIASES[raw] || raw;
    if (!normalized || !PROVIDER_ROLES.includes(normalized)) {
        throw new common_1.ForbiddenException('provider_scope_required');
    }
}
function isAdmin(user) { return user?.role === enums_1.UserRole.ADMIN || user?.role === 'super_admin'; }
function decisionToMirror(decision, kind) {
    if (kind === 'radiology') {
        const radMap = {
            APPROVED_FULL: 'approved',
            APPROVED_PARTIAL: 'approved',
            REJECTED: 'rejected',
        };
        return radMap[decision] || 'pending';
    }
    const map = {
        APPROVED_FULL: 'approved',
        APPROVED_PARTIAL: 'partial_approval',
        REJECTED: 'rejected',
    };
    return map[decision] || 'pending';
}
let ProviderProductionService = class ProviderProductionService {
    constructor(conn) {
        this.conn = conn;
    }
    async assertApprovedOperationalAccount(user, acceptedTypes) {
        assertProviderRole(user);
        if (isAdmin(user))
            return;
        const account = await this.conn.collection('provider_accounts').findOne({
            id: user?.id,
            provider_type: { $in: acceptedTypes },
            status: { $in: ['approved', 'active'] },
        });
        if (!account)
            throw new common_1.ForbiddenException('approved_provider_account_required');
    }
    async orderInsuranceDecision(user, orderId, body) {
        assertProviderRole(user);
        if (!Array.isArray(body?.items) || body.items.length === 0) {
            throw new common_1.BadRequestException('items_required');
        }
        const orders = this.conn.collection('orders');
        const order = await orders.findOne({ id: orderId });
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        if (!isAdmin(user) && String(order.pharmacy_id) !== String(user.id)) {
            throw new common_1.ForbiddenException('order_not_owned');
        }
        if (!['PENDING_INSURANCE', 'BASKET_REVIEW', 'ACCEPTED', 'PHARMACY_RECEIVED', 'VALIDATED'].includes(String(order.state))) {
            throw new common_1.BadRequestException(`invalid_state:${order.state}`);
        }
        let approvedCount = 0;
        let rejectedCount = 0;
        const applied = [];
        for (const dec of body.items) {
            const item = (order.items || []).find((i) => i.id === dec.item_id || String(i._id) === String(dec.item_id));
            if (!item) {
                rejectedCount++;
                continue;
            }
            const patch = {};
            if (dec.decision === 'approved') {
                patch.isCovered = true;
                patch.rejectReason = null;
                approvedCount++;
            }
            else if (dec.decision === 'alternative') {
                patch.isCovered = false;
                patch.rejectReason = `alternative:${dec.alternative_item_id || ''}`;
                approvedCount++;
            }
            else {
                patch.isCovered = false;
                patch.rejectReason = String(dec.reject_reason || 'not_covered');
                rejectedCount++;
            }
            await orders.updateOne({ id: orderId, 'items.id': item.id }, { $set: Object.fromEntries(Object.entries(patch).map(([k, v]) => [`items.$.${k}`, v])) });
            applied.push({ item_id: item.id, ...patch });
        }
        const status = approvedCount === 0 ? 'REJECTED' : rejectedCount > 0 ? 'PARTIAL' : 'APPROVED';
        const copayPercent = Math.min(100, Math.max(0, Number(body.copay_percent ?? 0)));
        const total = Number(order.total ?? order.total_amount ?? 0);
        const insurerShare = body.insurer_share != null
            ? Math.max(0, Number(body.insurer_share))
            : Math.max(0, Math.round(total * (1 - copayPercent / 100) * 100) / 100);
        const patientShare = Math.max(0, total - insurerShare);
        const now = new Date();
        await orders.updateOne({ id: orderId }, {
            $set: {
                state: status === 'APPROVED' || status === 'PARTIAL' ? 'PENDING_INSURANCE' : 'PENDING_INSURANCE',
                insurance_status: status === 'PARTIAL' ? 'PARTIAL_APPROVAL' : status,
                'insurance_details.approvalStatus': status,
                'insurance_details.items': applied,
                'insurance_details.copay_percent': copayPercent,
                'insurance_details.insurer_share': insurerShare,
                'insurance_details.patient_share': patientShare,
                'insurance_details.nphies_approval_code': body.nphies_approval_code || null,
                'insurance_details.policy_number': body.policy_number || null,
                'insurance_details.member_id': body.member_id || null,
                'insurance_details.decided_by': user.id,
                'insurance_details.decided_at': now,
                updatedAt: now,
            },
            $push: { state_history: { from: order.state, to: 'PENDING_INSURANCE', at: now, by_user_id: user.id, by_role: user.role, note: `insurance-decision:${status}` } },
        });
        return {
            ok: true,
            insurance_status: status === 'PARTIAL' ? 'PARTIAL' : status,
            copay_amount: patientShare,
            patient_share: patientShare,
            insurer_share: insurerShare,
            waiting_state: 'WAITING_COPAY',
            items: applied,
        };
    }
    async bookingCoverageDecision(user, kind, bookingId, body) {
        await this.assertApprovedOperationalAccount(user, kind === 'lab' ? ['lab', 'laboratory'] : kind === 'radiology' ? ['radiology'] : ['nursing', 'home_care', 'homecare']);
        const decision = body?.decision;
        if (!['APPROVED_FULL', 'APPROVED_PARTIAL', 'REJECTED'].includes(decision)) {
            throw new common_1.BadRequestException('decision must be APPROVED_FULL | APPROVED_PARTIAL | REJECTED');
        }
        const collection = kind === 'lab' ? 'labbookings' : kind === 'radiology' ? 'radiologybookings' : 'homecarebookings';
        const col = this.conn.collection(collection);
        const b = await col.findOne({ id: bookingId });
        if (!b)
            throw new common_1.NotFoundException('booking_not_found');
        if (!isAdmin(user) && b.provider_account_id && b.provider_account_id !== user.id) {
            throw new common_1.ForbiddenException('booking_not_owned');
        }
        if (!['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY'].includes(String(b.state))) {
            throw new common_1.BadRequestException(`invalid_state:${b.state}`);
        }
        const reason = String(body?.reason || '').trim();
        const decisionReference = String(body?.decision_reference || body?.approval_code || '').trim();
        if (decision === 'REJECTED' && !reason)
            throw new common_1.BadRequestException('rejection_reason_required');
        if (decision !== 'REJECTED' && !decisionReference)
            throw new common_1.BadRequestException('manual_decision_reference_required');
        const copayPercent = decision === 'APPROVED_PARTIAL'
            ? Math.min(99, Math.max(1, Number(body.copay_percent ?? 0)))
            : decision === 'APPROVED_FULL' ? 0 : undefined;
        if (decision === 'APPROVED_PARTIAL' && !copayPercent)
            throw new common_1.BadRequestException('copay_percent_required_for_partial_approval');
        const price = Number(b.pricing_snapshot?.total ?? b.server_total ?? b.total ?? b.price);
        if (!Number.isFinite(price) || price < 0)
            throw new common_1.BadRequestException('server_price_snapshot_required');
        const copayAmount = copayPercent != null ? Math.round(price * (copayPercent / 100) * 100) / 100 : 0;
        const now = new Date();
        const mirrorStatus = decisionToMirror(decision, kind);
        const nextState = decision === 'APPROVED_FULL' ? 'CONFIRMED' : decision === 'APPROVED_PARTIAL' ? 'WAITING_COPAY' : 'INSURANCE_REJECTED';
        await col.updateOne({ id: bookingId }, {
            $set: {
                state: nextState,
                insurance_status: mirrorStatus,
                insurance_copay_amount: copayAmount,
                ...(copayPercent != null ? { insurance_copay_percent: copayPercent } : {}),
                ...(decisionReference ? { insurance_approval_code: decisionReference } : {}),
                ...(decision === 'REJECTED' ? { insurance_rejection_reason: reason } : {}),
                insurance_decision: {
                    kind: 'manual_internal', decision, decision_reference: decisionReference || null, reason: reason || null,
                    price_snapshot: price, copay_percent: copayPercent ?? null, copay_amount: copayAmount,
                    decided_by: user.id, decided_at: now,
                },
                updatedAt: now,
            },
            $push: {
                state_history: {
                    from: b.state, to: nextState, at: now, by_user_id: user.id, by_role: user.role,
                    note: `coverage-decision:${decision}${copayPercent != null ? `:copay_${copayPercent}%` : ''}`,
                },
            },
        });
        this.emitSafe('insurance.booking.coverage_decided', { booking_kind: kind, booking_id: bookingId, decision, copay_amount: copayAmount, patient_id: b.patient_id });
        return {
            ok: true,
            booking_id: bookingId,
            insurance_status: mirrorStatus === 'partial_approval' ? 'PARTIAL_APPROVAL' : mirrorStatus.toUpperCase(),
            next_state: nextState,
            copay_amount: copayAmount,
        };
    }
    labCoverageDecision(user, id, body) { return this.bookingCoverageDecision(user, 'lab', id, body); }
    radiologyCoverageDecision(user, id, body) { return this.bookingCoverageDecision(user, 'radiology', id, body); }
    homecareCoverageDecision(user, id, body) { return this.bookingCoverageDecision(user, 'nursing', id, body); }
    emitSafe(event, payload) {
        try {
            this.conn.emit?.(event, payload);
        }
        catch { }
    }
    async listCrmPatients(user) {
        assertProviderRole(user);
        const records = await this.conn.collection('doctor_patient_crm')
            .find({ owner_id: user.id }, { projection: { _id: 0, patient_id: 1, data: 1, updatedAt: 1 } })
            .sort({ updatedAt: -1 }).limit(200).toArray();
        const patientIds = records.map((record) => String(record.patient_id)).filter(Boolean);
        const patients = patientIds.length
            ? await this.conn.collection('users').find({ id: { $in: patientIds } }, { projection: { _id: 0, id: 1, full_name: 1, name: 1, phone: 1 } }).toArray()
            : [];
        const names = new Map(patients.map((patient) => [String(patient.id), patient.full_name || patient.name || patient.phone || '']));
        return records.map((record) => ({
            patient_id: String(record.patient_id),
            name: names.get(String(record.patient_id)) || '',
            is_vip: Boolean(record.data?.vip),
            is_favorite: Boolean(record.data?.favorite),
            is_blocked: Boolean(record.data?.blocked),
            updated_at: record.updatedAt || null,
        }));
    }
    async getCrm(user, patientId) {
        assertProviderRole(user);
        const doc = await this.conn.collection('doctor_patient_crm').findOne({ owner_id: user.id, patient_id: patientId }, { projection: { _id: 0 } });
        if (!doc)
            throw new common_1.NotFoundException('crm_record_not_found');
        return doc.data || {};
    }
    async putCrm(user, patientId, data) {
        assertProviderRole(user);
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
            blocked: !!data?.blocked,
            blocked_reason: data?.blocked ? String(data?.blocked_reason || '').slice(0, 500) : '',
        };
        await this.conn.collection('doctor_patient_crm').updateOne({ owner_id: user.id, patient_id: patientId }, {
            $set: { data: clean, updatedAt: new Date() },
            $setOnInsert: { id: `crm_${Date.now()}`, owner_id: user.id, patient_id: patientId, createdAt: new Date() },
        }, { upsert: true });
        return clean;
    }
    async myReferrals(user) {
        assertProviderRole(user);
        const rows = [];
        const outbound = await this.conn.collection('outbound_referrals')
            .find({ referrer_doctor_id: user.id }).sort({ createdAt: -1 }).limit(100).toArray();
        for (const r of outbound) {
            rows.push({
                id: r.id || String(r._id),
                patient_name: r.patient_name || '',
                target_type: r.target_type || '',
                target_name: r.target_name || '',
                tests_summary: Array.isArray(r.requested_tests) ? r.requested_tests.join(', ') : (r.notes || ''),
                status: r.status || 'pending',
                created_at: r.createdAt || r.created_at || null,
            });
        }
        const me = await this.conn.collection('users').findOne({ id: user.id }, { projection: { _id: 1 } });
        const ids = [user.id, ...(me?._id ? [String(me._id)] : [])];
        const engine = await this.conn.collection('doctorreferrals')
            .find({ $or: [{ doctor_id: { $in: ids } }, { referring_doctor_id: { $in: ids } }] })
            .sort({ createdAt: -1 }).limit(100).toArray();
        for (const r of engine) {
            const returned = !!(r.diagnostic_results_returned);
            rows.push({
                id: String(r._id),
                patient_name: r.patient_name || '',
                target_type: r.requested_radiology_scans?.length && r.requested_lab_tests?.length ? 'both'
                    : r.requested_radiology_scans?.length ? 'radiology'
                        : r.requested_lab_tests?.length ? 'lab' : 'home_care',
                target_name: r.target_facility_name || '',
                tests_summary: [...(r.requested_lab_tests || []), ...(r.requested_radiology_scans || [])].join(', '),
                status: returned ? 'completed' : 'pending',
                created_at: r.createdAt || null,
            });
        }
        return rows;
    }
    async createReferral(user, body) {
        assertProviderRole(user);
        const role = ROLE_ALIASES[String(user?.role || '').toLowerCase()] || String(user?.role || '').toLowerCase();
        if (!isAdmin(user) && role !== enums_1.UserRole.DOCTOR)
            throw new common_1.ForbiddenException('doctor_scope_required');
        const patientId = String(body?.patient_id || '').trim();
        const targetType = String(body?.target_type || '').trim().toLowerCase();
        if (!patientId || !['lab', 'radiology', 'nursing'].includes(targetType) || !String(body?.notes || '').trim()) {
            throw new common_1.BadRequestException('patient_target_and_notes_required');
        }
        const patient = await this.conn.collection('users').findOne({ id: patientId });
        if (!patient || String(patient.role || '').toLowerCase() !== 'patient') {
            throw new common_1.NotFoundException('patient_not_found');
        }
        const appointmentId = String(body?.appointment_id || '').trim();
        if (appointmentId) {
            const appointment = await this.conn.collection('appointments').findOne({ $or: [{ id: appointmentId }, { appointment_id: appointmentId }] });
            if (!appointment)
                throw new common_1.NotFoundException('appointment_not_found');
            const appointmentPatientId = appointment.patient_id || appointment.patientId || appointment.user_id;
            if (!appointmentPatientId || String(appointmentPatientId) !== patientId)
                throw new common_1.ForbiddenException('appointment_patient_mismatch');
            const appointmentProviderIds = [appointment.doctor_id, appointment.provider_id, appointment.provider_account_id, appointment.doctor_user_id]
                .filter(Boolean).map(String);
            if (!isAdmin(user) && !appointmentProviderIds.includes(String(user.id)))
                throw new common_1.ForbiddenException('appointment_not_owned');
        }
        const targetProviderId = String(body?.target_provider_id || body?.destination_provider_id || '').trim();
        let targetName = String(body?.target_name || '').trim();
        if (targetProviderId) {
            const targetProfile = await this.conn.collection('provider_profiles').findOne({ account_id: targetProviderId });
            const profileType = String(targetProfile?.type || targetProfile?.provider_type || '').toLowerCase();
            if (!targetProfile || profileType !== targetType)
                throw new common_1.BadRequestException('invalid_referral_destination');
            const targetAccount = await this.conn.collection('provider_accounts').findOne({ id: targetProviderId, status: { $in: ['approved', 'active'] } });
            if (!targetAccount)
                throw new common_1.BadRequestException('inactive_referral_destination');
            targetName = targetProfile.display_name_ar || targetProfile.business_name || targetProfile.display_name_en || targetName;
        }
        const now = new Date();
        const row = {
            id: (0, crypto_1.randomUUID)(),
            referrer_doctor_id: user.id,
            appointment_id: appointmentId || null,
            patient_id: patientId,
            patient_name: patient.full_name || patient.name || patient.name_ar || patient.name_en || '',
            target_type: targetType,
            target_provider_id: targetProviderId || null,
            target_name: targetName,
            requested_tests: Array.isArray(body.requested_tests) ? body.requested_tests.slice(0, 50).map(String) : [],
            referral_code: `REF-${(0, crypto_1.randomUUID)().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
            notes: String(body.notes).trim(),
            urgent: Boolean(body.urgent),
            status: 'pending',
            created_at: now,
            createdAt: now,
            updatedAt: now,
        };
        await this.conn.collection('outbound_referrals').insertOne(row);
        return { ...row, _id: undefined };
    }
    async referralNetwork(user) {
        assertProviderRole(user);
        const profiles = await this.conn.collection('provider_profiles')
            .find({ $or: [{ type: { $in: ['lab', 'radiology'] } }, { provider_type: { $in: ['lab', 'radiology'] } }] }, { projection: { _id: 0, account_id: 1, type: 1, provider_type: 1, business_name: 1, display_name_ar: 1, display_name_en: 1 } })
            .limit(200).toArray();
        const accountIds = profiles.map((profile) => String(profile.account_id)).filter(Boolean);
        const accounts = accountIds.length
            ? await this.conn.collection('provider_accounts').find({ id: { $in: accountIds }, status: { $in: ['approved', 'active'] } }, { projection: { _id: 0, id: 1 } }).toArray()
            : [];
        const activeAccounts = new Set(accounts.map((account) => String(account.id)));
        return profiles.filter((profile) => activeAccounts.has(String(profile.account_id))).map((profile) => ({
            id: String(profile.account_id),
            name: profile.display_name_ar || profile.business_name || profile.display_name_en || '',
            name_en: profile.display_name_en || profile.business_name || profile.display_name_ar || '',
            type: profile.type || profile.provider_type,
        }));
    }
    async listPromotions(user) {
        assertProviderRole(user);
        return this.conn.collection('promotioncampaigns')
            .find({ $or: [{ provider_account_id: user.id }, { provider_id: user.id }] }, { projection: { _id: 0 } })
            .sort({ createdAt: -1 }).limit(100).toArray();
    }
    async createPromotion(user, body) {
        assertProviderRole(user);
        if (!String(body?.title_ar || body?.title_en || '').trim())
            throw new common_1.BadRequestException('promotion_title_required');
        const original = Number(body?.original_price);
        const discounted = Number(body?.discounted_price);
        if (!Number.isFinite(original) || !Number.isFinite(discounted) || original < 0 || discounted < 0 || discounted > original) {
            throw new common_1.BadRequestException('invalid_promotion_prices');
        }
        const start = new Date(body?.start_date);
        const end = new Date(body?.end_date);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start)
            throw new common_1.BadRequestException('invalid_promotion_dates');
        const now = new Date();
        const row = {
            id: (0, crypto_1.randomUUID)(), provider_account_id: user.id, provider_id: user.id,
            title_ar: String(body?.title_ar || '').trim(), title_en: String(body?.title_en || '').trim(),
            original_price: original, discounted_price: discounted, start_date: start, end_date: end,
            target_parameters: body?.target_parameters || {}, status: 'pending_review', createdAt: now, updatedAt: now,
        };
        await this.conn.collection('promotioncampaigns').insertOne(row);
        return { ...row, _id: undefined };
    }
    async technicianCollection() { return this.conn.collection('technician_roster'); }
    async listTechnicians(user) {
        assertProviderRole(user);
        const q = { owner_account_id: user.id };
        if (isAdmin(user))
            delete q.owner_account_id;
        return this.conn.collection('technician_roster').find(q, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    }
    async createTechnician(user, body) {
        assertProviderRole(user);
        if (!body?.full_name?.trim() || !body?.phone?.trim())
            throw new common_1.BadRequestException('full_name_phone_required');
        const col = await this.technicianCollection();
        const dup = await col.findOne({ owner_account_id: user.id, phone: body.phone.trim() });
        if (dup)
            throw new common_1.BadRequestException('technician_exists');
        const doc = {
            id: `tech_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
            owner_account_id: user.id,
            full_name: String(body.full_name).trim().slice(0, 120),
            phone: String(body.phone).trim(),
            department: body.department ? String(body.department).slice(0, 80) : undefined,
            specialty: body.specialty ? String(body.specialty).slice(0, 80) : undefined,
            suspended: false,
            createdAt: new Date(),
        };
        await col.insertOne(doc);
        const { _id, ...out } = doc;
        return out;
    }
    async updateTechnician(user, techId, body) {
        assertProviderRole(user);
        const col = await this.technicianCollection();
        const t = await col.findOne({ id: techId });
        if (!t)
            throw new common_1.NotFoundException('technician_not_found');
        if (!isAdmin(user) && t.owner_account_id !== user.id)
            throw new common_1.ForbiddenException('not_owner');
        const patch = {};
        for (const k of ['full_name', 'phone', 'department', 'specialty'])
            if (body?.[k] !== undefined)
                patch[k] = String(body[k]).slice(0, 120);
        if (body?.suspended !== undefined)
            patch.suspended = !!body.suspended;
        await col.updateOne({ id: techId }, { $set: { ...patch, updatedAt: new Date() } });
        const updated = await col.findOne({ id: techId }, { projection: { _id: 0 } });
        return updated;
    }
    async deleteTechnician(user, techId) {
        assertProviderRole(user);
        const col = await this.technicianCollection();
        const t = await col.findOne({ id: techId });
        if (!t)
            throw new common_1.NotFoundException('technician_not_found');
        if (!isAdmin(user) && t.owner_account_id !== user.id)
            throw new common_1.ForbiddenException('not_owner');
        await col.deleteOne({ id: techId });
        return { ok: true };
    }
    async claimAction(user, claimId, action, body) {
        assertProviderRole(user);
        const col = this.conn.collection('insurance_claims');
        const claim = await col.findOne({ id: claimId });
        if (!claim)
            throw new common_1.NotFoundException('claim_not_found');
        const statusMap = { resubmit: 'pending', approve: 'approved', reject: 'rejected' };
        const nextStatus = statusMap[action];
        if (action === 'reject' && !String(body?.reason || '').trim()) {
            throw new common_1.BadRequestException('rejection reason is required');
        }
        if (!isAdmin(user)) {
            const me = await this.conn.collection('users').findOne({ id: user.id }, { projection: { parent_provider_account_id: 1, facility_id: 1 } });
            const myFacility = me?.parent_provider_account_id || me?.facility_id || user.facility_id || user.parent_provider_account_id;
            const claimFacility = claim.facility_account_id || claim.provider_account_id;
            if (!(myFacility && claimFacility && String(myFacility) === String(claimFacility))) {
                throw new common_1.ForbiddenException('claim_not_owned');
            }
        }
        if (action === 'approve' && !['pending', 'resubmitted'].includes(String(claim.status))) {
            throw new common_1.BadRequestException(`invalid_claim_status:${claim.status}`);
        }
        await col.updateOne({ id: claimId }, {
            $set: { status: nextStatus, updatedAt: new Date(), last_action: action, last_action_by: user.id, last_action_at: new Date() },
            $push: {
                history: {
                    action, by: user.id, role: user.role, at: new Date(),
                    reason: action === 'reject' ? String(body.reason).trim() : undefined,
                    documents: action === 'resubmit' ? (body.updated_documents || []) : undefined,
                },
            },
        });
        const updated = await col.findOne({ id: claimId }, { projection: { _id: 0 } });
        return { ok: true, claim_id: claimId, claim_status: nextStatus.toUpperCase(), acted_by: user.id, acted_at: new Date().toISOString(), claim: updated };
    }
    async inboundReports(user) {
        assertProviderRole(user);
        const me = await this.conn.collection('users').findOne({ id: user.id }, { projection: { _id: 1 } });
        const ids = [user.id, ...(me?._id ? [String(me._id)] : [])];
        const rad = await this.conn.collection('radiologybookings')
            .find({
            $or: [{ referring_doctor_id: { $in: ids } }, { referrer_doctor_id: { $in: ids } }],
            state: { $in: ['REPORT_DRAFT', 'UNDER_REVIEW', 'REPORT_READY', 'REPORT_PUBLISHED'] },
        })
            .sort({ updatedAt: -1 }).limit(50)
            .project({ _id: 0, id: 1, state: 1, patient_name: 1, scan_name_ar: 1, scan_name_en: 1, report_pdf_url: 1, published_at: 1, createdAt: 1 })
            .toArray();
        const lab = await this.conn.collection('labbookings')
            .find({ referring_doctor_id: { $in: ids }, reports: { $exists: true, $ne: [] } })
            .sort({ updatedAt: -1 }).limit(50)
            .toArray();
        const labRows = lab.map((b) => {
            const lastReport = (b.reports || [])[(b.reports || []).length - 1] || {};
            return {
                id: `lab-${b.id}-${lastReport.id || 'r'}`,
                kind: 'LAB',
                booking_id: b.id,
                patient_name: b.patient_name || '',
                test_name: (b.items || []).map((i) => i.service_name_ar || i.service_name_en || i.name_en || i.name || '').filter(Boolean).join(', ') || (b.test_name || ''),
                status: b.state === 'REPORTED' ? 'REPORTED' : 'RESULT_UPLOADED',
                report_url: lastReport.url || `/api/v1/storage/${lastReport.url || ''}`,
                dicom_viewer_url: null,
                published_at: lastReport.uploaded_at || null,
                created_at: lastReport.uploaded_at || b.createdAt || null,
            };
        });
        const radRows = rad.map((b) => ({
            id: `rad-${b.id}`,
            kind: 'RADIOLOGY',
            booking_id: b.id,
            patient_name: b.patient_name || '',
            test_name: b.scan_name_ar || b.scan_name_en || '',
            status: b.state,
            report_url: b.report_pdf_url || null,
            dicom_viewer_url: null,
            published_at: b.published_at || null,
            created_at: b.createdAt || null,
        }));
        return [...radRows, ...labRows].sort((a, b) => new Date(b.published_at || b.created_at || 0).getTime() - new Date(a.published_at || a.created_at || 0).getTime());
    }
    async getAvailability(user) {
        assertProviderRole(user);
        const account = await this.conn.collection('provider_accounts').findOne({ id: user.id }, { projection: { _id: 0, availability: 1 } });
        if (!account)
            throw new common_1.NotFoundException('provider_account_not_found');
        return account.availability ?? null;
    }
    async patchAvailability(user, body) {
        assertProviderRole(user);
        const allowedKeys = ['is_accepting_requests', 'instant_available', 'instant_available_minutes', 'vacation_mode', 'vacation_from', 'vacation_to', 'weekly_schedule', 'availability_exceptions'];
        const patch = {};
        for (const key of allowedKeys)
            if (body?.[key] !== undefined)
                patch[key] = body[key];
        if (!Object.keys(patch).length)
            throw new common_1.BadRequestException('no_mutable_availability_fields');
        if (patch.weekly_schedule !== undefined && !Array.isArray(patch.weekly_schedule)) {
            throw new common_1.BadRequestException('weekly_schedule_must_be_array');
        }
        if (patch.availability_exceptions !== undefined && !Array.isArray(patch.availability_exceptions)) {
            throw new common_1.BadRequestException('availability_exceptions_must_be_array');
        }
        if (patch.instant_available_minutes !== undefined && (!Number.isInteger(patch.instant_available_minutes) || patch.instant_available_minutes < 1 || patch.instant_available_minutes > 120)) {
            throw new common_1.BadRequestException('instant_available_minutes_must_be_integer_between_1_and_120');
        }
        const account = await this.conn.collection('provider_accounts').findOne({ id: user.id }, { projection: { _id: 0, availability: 1 } });
        if (!account)
            throw new common_1.NotFoundException('provider_account_not_found');
        const availability = { ...(account.availability || {}), ...patch };
        await this.conn.collection('provider_accounts').updateOne({ id: user.id }, { $set: { availability, availability_updated_at: new Date(), updatedAt: new Date() } });
        const back = await this.conn.collection('provider_accounts').findOne({ id: user.id }, { projection: { _id: 0, availability: 1 } });
        if (!back || JSON.stringify(back.availability) !== JSON.stringify(availability)) {
            throw new common_1.BadRequestException('availability_roundtrip_failed');
        }
        return { ok: true, availability: back.availability };
    }
};
exports.ProviderProductionService = ProviderProductionService;
exports.ProviderProductionService = ProviderProductionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], ProviderProductionService);
let ProviderProductionController = class ProviderProductionController {
    constructor(svc) {
        this.svc = svc;
    }
    orderInsurance(u, id, b) {
        return this.svc.orderInsuranceDecision(u, id, b);
    }
    labCoverage(u, id, b) { return this.svc.labCoverageDecision(u, id, b); }
    radCoverage(u, id, b) { return this.svc.radiologyCoverageDecision(u, id, b); }
    nursingCoverage(u, id, b) { return this.svc.homecareCoverageDecision(u, id, b); }
    listCrmPatients(u) { return this.svc.listCrmPatients(u); }
    getCrm(u, p) { return this.svc.getCrm(u, p); }
    postCrm(u, p, b) { return this.svc.putCrm(u, p, b); }
    putCrm(u, p, b) { return this.svc.putCrm(u, p, b); }
    myReferrals(u) { return this.svc.myReferrals(u); }
    createReferral(u, b) { return this.svc.createReferral(u, b); }
    referralNetwork(u) { return this.svc.referralNetwork(u); }
    listPromotions(u) { return this.svc.listPromotions(u); }
    createPromotion(u, b) { return this.svc.createPromotion(u, b); }
    listTechs(u) { return this.svc.listTechnicians(u); }
    createTech(u, b) { return this.svc.createTechnician(u, b); }
    updateTech(u, id, b) { return this.svc.updateTechnician(u, id, b); }
    deleteTech(u, id) { return this.svc.deleteTechnician(u, id); }
    claimResubmit(u, id, b) { return this.svc.claimAction(u, id, 'resubmit', b); }
    claimApprove(u, id, b) { return this.svc.claimAction(u, id, 'approve', b); }
    claimReject(u, id, b) { return this.svc.claimAction(u, id, 'reject', b); }
    inboundReports(u) { return this.svc.inboundReports(u); }
    getAvailability(u) { return this.svc.getAvailability(u); }
    patchAvailability(u, b) { return this.svc.patchAvailability(u, b); }
};
exports.ProviderProductionController = ProviderProductionController;
__decorate([
    (0, common_1.Post)('orders/:id/insurance-decision'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "orderInsurance", null);
__decorate([
    (0, common_1.Post)('labs/bookings/:id/coverage-decision'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "labCoverage", null);
__decorate([
    (0, common_1.Post)('radiology/bookings/:id/coverage-decision'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "radCoverage", null);
__decorate([
    (0, common_1.Post)('home-care/bookings/:id/coverage-decision'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "nursingCoverage", null);
__decorate([
    (0, common_1.Get)('provider/crm'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "listCrmPatients", null);
__decorate([
    (0, common_1.Get)('provider/crm/:patientId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('patientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "getCrm", null);
__decorate([
    (0, common_1.Post)('provider/crm/:patientId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('patientId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "postCrm", null);
__decorate([
    (0, common_1.Put)('provider/crm/:patientId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('patientId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "putCrm", null);
__decorate([
    (0, common_1.Get)('provider/referrals/mine'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "myReferrals", null);
__decorate([
    (0, common_1.Post)('provider/referrals'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "createReferral", null);
__decorate([
    (0, common_1.Get)('provider/referral-network'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "referralNetwork", null);
__decorate([
    (0, common_1.Get)('provider/promotions'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderProductionController.prototype, "listPromotions", null);
__decorate([
    (0, common_1.Post)('provider/promotions'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "createPromotion", null);
__decorate([
    (0, common_1.Get)('hospital/staff-roster/technicians'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "listTechs", null);
__decorate([
    (0, common_1.Post)('hospital/staff-roster/technicians'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "createTech", null);
__decorate([
    (0, common_1.Patch)('hospital/staff-roster/technicians/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "updateTech", null);
__decorate([
    (0, common_1.Delete)('hospital/staff-roster/technicians/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "deleteTech", null);
__decorate([
    (0, common_1.Post)('claims/:id/resubmit'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "claimResubmit", null);
__decorate([
    (0, common_1.Post)('claims/:id/approve'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "claimApprove", null);
__decorate([
    (0, common_1.Post)('claims/:id/reject'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "claimReject", null);
__decorate([
    (0, common_1.Get)('provider/reports/inbound'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "inboundReports", null);
__decorate([
    (0, common_1.Get)('provider/profile/availability'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "getAvailability", null);
__decorate([
    (0, common_1.Patch)('provider/profile/availability'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderProductionController.prototype, "patchAvailability", null);
exports.ProviderProductionController = ProviderProductionController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ProviderProductionService])
], ProviderProductionController);
let ProviderProductionModule = class ProviderProductionModule {
};
exports.ProviderProductionModule = ProviderProductionModule;
exports.ProviderProductionModule = ProviderProductionModule = __decorate([
    (0, common_1.Module)({
        controllers: [ProviderProductionController],
        providers: [ProviderProductionService],
    })
], ProviderProductionModule);
//# sourceMappingURL=provider-production.module.js.map