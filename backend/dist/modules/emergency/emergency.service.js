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
exports.EmergencyService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const common_2 = require("@nestjs/common");
const ambulance_vehicle_schema_1 = require("../../schemas/ambulance-vehicle.schema");
const enums_1 = require("../../common/enums");
const events_1 = require("../../common/events");
const emergencyrequest_repository_1 = require("./repositories/emergencyrequest.repository");
const DISPATCH_WEIGHTS = {
    typeCriticalIcu: 40,
    typeCriticalAls: 25,
    typeMatchBase: 10,
    etaMax: 35,
    sameCity: 8,
    ratingMax: 10,
    workloadPenalty: 8,
    hospitalBonus: Number(process.env.AMBULANCE_HOSPITAL_PRIORITY_BONUS || 0),
};
let EmergencyService = class EmergencyService {
    constructor(model, vehicles, conn, events) {
        this.model = model;
        this.vehicles = vehicles;
        this.conn = conn;
        this.events = events;
    }
    patientView(e) {
        const o = e?.toObject ? e.toObject() : e;
        if (!o)
            return null;
        const assigned = !!o.assigned_ambulance_id || !!o.assigned_hospital_id;
        const loc = o.location ? { lat: o.location.lat, lng: o.location.lng, address: o.location.address } : undefined;
        return {
            id: o.id,
            state: o.state,
            symptoms: o.symptoms,
            severity: o.severity,
            location: loc,
            assigned,
            unit_label: o.unit_label || null,
            paramedic_name: o.paramedic_name || null,
            createdAt: o.createdAt,
        };
    }
    async autoDispatch(id, by = { id: 'system', role: 'system' }) {
        const e = await this.model.findOne({ id });
        if (!e)
            throw new common_1.NotFoundException();
        const o = e.toObject ? e.toObject() : e;
        if (o.assigned_ambulance_id || [enums_1.EmergencyState.RESOLVED, enums_1.EmergencyState.CLOSED, enums_1.EmergencyState.CANCELLED].includes(o.state)) {
            return { ok: false, reason: 'already_assigned_or_closed' };
        }
        const candidates = await this.vehicles.find({ status: 'approved', is_available: true }).lean();
        if (!candidates.length)
            return { ok: false, reason: 'no_available_units' };
        const critical = String(o.severity || '').toLowerCase() === 'critical';
        const pLat = o.location?.lat, pLng = o.location?.lng;
        const profiles = this.conn.db.collection('provider_profiles');
        const users = this.conn.db.collection('users');
        const activeStates = { $nin: [enums_1.EmergencyState.RESOLVED, enums_1.EmergencyState.CLOSED, enums_1.EmergencyState.CANCELLED] };
        let best = null;
        for (const v of candidates) {
            let score = 0;
            const vt = v.vehicle_type || (v.has_icu ? 'ICU' : 'BLS');
            if (critical)
                score += vt === 'ICU' ? DISPATCH_WEIGHTS.typeCriticalIcu : vt === 'ALS' ? DISPATCH_WEIGHTS.typeCriticalAls : 0;
            else
                score += DISPATCH_WEIGHTS.typeMatchBase;
            const ll = v.last_location;
            if (ll?.lat && ll?.lng && pLat && pLng) {
                const km = this.haversineKm(ll.lat, ll.lng, pLat, pLng);
                const eta = (km / 40) * 60;
                score += Math.max(0, DISPATCH_WEIGHTS.etaMax - Math.min(DISPATCH_WEIGHTS.etaMax, eta));
            }
            else if (v.base_city && o.location?.address && String(o.location.address).includes(v.base_city)) {
                score += DISPATCH_WEIGHTS.sameCity;
            }
            const prof = await profiles.findOne({ account_id: v.provider_account_id }, { projection: { rating_avg: 1, type: 1 } });
            score += Math.min(DISPATCH_WEIGHTS.ratingMax, (prof?.rating_avg || 0) * 2);
            if (DISPATCH_WEIGHTS.hospitalBonus && (prof?.type === 'hospital' || prof?.type === 'clinic')) {
                score += DISPATCH_WEIGHTS.hospitalBonus;
            }
            const active = await this.model.countDocuments({ assigned_ambulance_id: v.id, state: activeStates });
            score -= active * DISPATCH_WEIGHTS.workloadPenalty;
            if (!best || score > best.score)
                best = { v, score };
        }
        if (!best)
            return { ok: false, reason: 'no_available_units' };
        const v = best.v;
        const res = await this.model.updateOne({ id, assigned_ambulance_id: { $in: [null, undefined] }, state: { $nin: [enums_1.EmergencyState.RESOLVED, enums_1.EmergencyState.CLOSED, enums_1.EmergencyState.CANCELLED] } }, { $set: {
                assigned_ambulance_id: v.id,
                assigned_provider_id: v.provider_account_id,
                unit_label: v.plate_number || null,
                claimed_at: new Date(),
                state: enums_1.EmergencyState.DISPATCH_INITIATED,
                updatedAt: new Date(),
            },
            $push: { state_history: { from: o.state, to: enums_1.EmergencyState.DISPATCH_INITIATED, by: by.id || 'system', at: new Date(), note: 'auto_dispatch' } },
        });
        if (!res)
            return { ok: false, reason: 'race_lost' };
        this.events.emit(events_1.EVENTS.EMERGENCY_ASSIGNED, { emergency_id: id, vehicle_id: v.id, auto: true });
        return { ok: true, id, vehicle_id: v.id, score: best.score };
    }
    async trigger(patient, data) {
        const e = await this.model.create({
            patient_id: patient.id,
            patient_name: patient.full_name,
            patient_phone: patient.phone,
            location: data.location,
            symptoms: data.symptoms,
            severity: data.severity || 'critical',
            state: enums_1.EmergencyState.TRIGGERED,
            state_history: [{ from: '', to: enums_1.EmergencyState.TRIGGERED, by: patient.id, at: new Date() }],
        });
        this.events.emit(events_1.EVENTS.EMERGENCY_TRIGGERED, { emergency_id: e.id, patient_id: patient.id });
        if (data.location)
            await this.transition(e.id, enums_1.EmergencyState.LOCATION_CAPTURED, { id: 'system', role: 'system' });
        await this.transition(e.id, enums_1.EmergencyState.ADMIN_NOTIFIED, { id: 'system', role: 'system' });
        this.autoDispatch(e.id).catch(() => { });
        return this.patientView(await this.model.findOne({ id: e.id }));
    }
    async transition(id, to, by) {
        const e = await this.model.findOne({ id });
        if (!e)
            throw new common_1.NotFoundException();
        const allowed = enums_1.EMERGENCY_TRANSITIONS[e.state] || [];
        if (by.role !== enums_1.UserRole.ADMIN && by.role !== 'system' && !allowed.includes(to)) {
            throw new common_1.BadRequestException(`Invalid emergency transition ${e.state} → ${to}`);
        }
        e.state_history.push({ from: e.state, to, by: by.id, at: new Date() });
        e.state = to;
        await e.save();
        return e.toObject();
    }
    async assign(id, hospital_id, by) {
        const e = await this.model.findOneAndUpdate({ id }, { $set: { assigned_hospital_id: hospital_id, state: enums_1.EmergencyState.DISPATCH_INITIATED } }, { new: true });
        if (!e)
            throw new common_1.NotFoundException();
        this.events.emit(events_1.EVENTS.EMERGENCY_ASSIGNED, { emergency_id: id, hospital_id });
        return e.toObject();
    }
    async resolve(id, by, notes) {
        const e = await this.model.findOneAndUpdate({ id }, { $set: { state: enums_1.EmergencyState.RESOLVED, resolved_at: new Date(), resolved_by: by.id, admin_notes: notes } }, { new: true });
        if (!e)
            throw new common_1.NotFoundException();
        this.events.emit(events_1.EVENTS.EMERGENCY_RESOLVED, { emergency_id: id });
        return e.toObject();
    }
    async active() {
        return this.model.find({ state: { $nin: [enums_1.EmergencyState.RESOLVED, enums_1.EmergencyState.CLOSED, enums_1.EmergencyState.CANCELLED] } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 });
    }
    async cancelOwn(id, patientId) {
        const e = await this.model.findOneAndUpdate({
            id,
            patient_id: patientId,
            state: { $nin: [enums_1.EmergencyState.RESOLVED, enums_1.EmergencyState.CLOSED, enums_1.EmergencyState.CANCELLED] },
        }, {
            $set: { state: enums_1.EmergencyState.CANCELLED, cancelled_at: new Date(), updatedAt: new Date() },
            $push: { state_history: { from: '', to: enums_1.EmergencyState.CANCELLED, by: patientId, at: new Date(), note: 'patient_cancelled' } },
        }, { new: true });
        if (!e)
            throw new common_1.NotFoundException('no_active_sos_for_patient');
        this.events.emit(events_1.EVENTS.EMERGENCY_RESOLVED, { emergency_id: id, cancelled_by_patient: true });
        return e.toObject();
    }
    async myActive(patientId) {
        const e = await this.model.findOne({ patient_id: patientId, state: { $nin: [enums_1.EmergencyState.RESOLVED, enums_1.EmergencyState.CLOSED, enums_1.EmergencyState.CANCELLED] } }, { _id: 0, __v: 0 });
        return this.patientView(e);
    }
    async driverMissions(providerId) {
        const vehicles = await this.vehicles.find({ provider_account_id: providerId, status: 'approved', is_available: true }, { id: 1, plate_number: 1, vehicle_type: 1 }).lean();
        if (!vehicles.length)
            return { pool: [], mine: [], vehicles: [] };
        const [pool, mine] = await Promise.all([
            this.model.find({ assigned_ambulance_id: { $in: [null, undefined] }, state: { $nin: [enums_1.EmergencyState.RESOLVED, enums_1.EmergencyState.CLOSED, enums_1.EmergencyState.CANCELLED] } }, { _id: 0, __v: 0, patient_phone: 0, patient_id: 0, assigned_provider_id: 0, assigned_hospital_id: 0 }).sort({ createdAt: -1 }).limit(20),
            this.model.find({ assigned_provider_id: providerId, assigned_ambulance_id: { $in: vehicles.map((v) => v.id) }, state: { $nin: [enums_1.EmergencyState.RESOLVED, enums_1.EmergencyState.CLOSED, enums_1.EmergencyState.CANCELLED] } }, { _id: 0, __v: 0, patient_phone: 0, patient_id: 0, assigned_provider_id: 0, assigned_hospital_id: 0 }).sort({ createdAt: -1 }).limit(20),
        ]);
        return { pool, mine, vehicles: vehicles.map((v) => ({ id: v.id, label: v.plate_number, type: v.vehicle_type })) };
    }
    async claim(id, providerId, vehicleId) {
        if (!vehicleId)
            throw new common_1.BadRequestException('approved_vehicle_required');
        const vehicle = await this.vehicles.findOne({ id: vehicleId, provider_account_id: providerId, status: 'approved', is_available: true }).lean();
        if (!vehicle)
            throw new common_2.ForbiddenException('vehicle_not_verified_or_not_owned');
        const doc = await this.model.updateOne({ id, assigned_ambulance_id: { $in: [null, undefined] }, state: { $nin: [enums_1.EmergencyState.RESOLVED, enums_1.EmergencyState.CLOSED, enums_1.EmergencyState.CANCELLED] } }, { $set: { assigned_ambulance_id: vehicle.id, assigned_provider_id: providerId, unit_label: vehicle.plate_number || null, claimed_at: new Date(), state: enums_1.EmergencyState.DISPATCH_INITIATED, updatedAt: new Date() } });
        if (!doc)
            throw new common_1.BadRequestException('already_claimed_or_closed');
        return { ok: true, id, vehicle_id: vehicle.id, state: enums_1.EmergencyState.DISPATCH_INITIATED };
    }
    async getById(id) {
        const e = await this.model.findOne({ id }, { _id: 0, __v: 0 });
        if (!e)
            throw new common_1.NotFoundException();
        return e;
    }
    haversineKm(lat1, lng1, lat2, lng2) {
        const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    }
    async tracking(patientId) {
        const e = await this.model.findOne({ patient_id: patientId, state: { $nin: [enums_1.EmergencyState.RESOLVED, enums_1.EmergencyState.CLOSED, enums_1.EmergencyState.CANCELLED] } }, { _id: 0, __v: 0 });
        if (!e)
            return { active: false };
        const o = e.toObject ? e.toObject() : e;
        let eta_minutes = null;
        let distance_km = null;
        const u = o.unit_location, p = o.location;
        if (u?.lat && u?.lng && p?.lat && p?.lng) {
            distance_km = Math.round(this.haversineKm(u.lat, u.lng, p.lat, p.lng) * 10) / 10;
            eta_minutes = Math.max(1, Math.round((distance_km / 40) * 60));
        }
        const claimed = !!o.assigned_ambulance_id;
        const steps = [
            { key: 'received', title_ar: 'تم استلام النداء', done: true },
            { key: 'assigned', title_ar: 'تم تخصيص سيارة إسعاف', done: claimed, current: claimed && !u?.lat },
            { key: 'en_route', title_ar: 'سيارة الإسعاف في الطريق', done: !!u?.lat, current: claimed && !!u?.lat },
            { key: 'arrived', title_ar: 'الوصول إلى موقعك', done: false },
        ];
        return {
            active: true,
            id: o.id,
            state: o.state,
            unit_label: o.unit_label || null,
            paramedic_name: o.paramedic_name || null,
            claimed_at: o.claimed_at || null,
            unit_location: u?.lat ? { lat: u.lat, lng: u.lng, updated_at: u.updated_at } : null,
            eta_minutes,
            distance_km,
            steps,
        };
    }
    async updateUnitLocation(id, providerId, body) {
        const lat = Number(body?.lat), lng = Number(body?.lng);
        if (!isFinite(lat) || !isFinite(lng))
            throw new common_1.BadRequestException('lat_lng_required');
        if (!body?.vehicle_id)
            throw new common_1.BadRequestException('approved_vehicle_required');
        const vehicle = await this.vehicles.findOne({ id: body.vehicle_id, provider_account_id: providerId, status: 'approved' }).lean();
        if (!vehicle)
            throw new common_2.ForbiddenException('vehicle_not_verified_or_not_owned');
        const res = await this.model.updateOne({ id, assigned_ambulance_id: vehicle.id, assigned_provider_id: providerId, state: { $nin: [enums_1.EmergencyState.RESOLVED, enums_1.EmergencyState.CLOSED, enums_1.EmergencyState.CANCELLED] } }, { $set: { unit_location: { lat, lng, updated_at: new Date() }, updatedAt: new Date() } });
        if (!res)
            throw new common_1.NotFoundException('mission_not_found_or_not_yours');
        return { ok: true };
    }
};
exports.EmergencyService = EmergencyService;
exports.EmergencyService = EmergencyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('EmergencyRequestRepository')),
    __param(1, (0, mongoose_1.InjectModel)(ambulance_vehicle_schema_1.AmbulanceVehicle.name)),
    __param(2, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [emergencyrequest_repository_1.EmergencyRequestRepository,
        mongoose_2.Model,
        mongoose_2.Connection,
        event_emitter_1.EventEmitter2])
], EmergencyService);
//# sourceMappingURL=emergency.service.js.map