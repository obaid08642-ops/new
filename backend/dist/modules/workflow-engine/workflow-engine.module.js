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
exports.WorkflowEngineModule = exports.WorkflowController = exports.WorkflowEngineService = exports.STATE_MAP = void 0;
exports.toUniversal = toUniversal;
exports.domainStatesFor = domainStatesFor;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const order_schema_1 = require("../../schemas/order.schema");
const lab_schema_1 = require("../../schemas/lab.schema");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const facility_schema_1 = require("../../schemas/facility.schema");
const event_bus_service_1 = require("../events/event-bus.service");
exports.STATE_MAP = {
    pharmacy: {
        DRAFT: enums_1.ServiceState.REQUESTED,
        CREATED: enums_1.ServiceState.REQUESTED,
        VALIDATED: enums_1.ServiceState.REQUESTED,
        BROADCAST: enums_1.ServiceState.MATCHING,
        BROADCASTING: enums_1.ServiceState.MATCHING,
        PHARMACY_BROADCAST: enums_1.ServiceState.MATCHING,
        AWAITING_FULL_ACCEPTANCE: enums_1.ServiceState.MATCHING,
        READY_FOR_SPLIT: enums_1.ServiceState.MATCHING,
        ALLOCATING: enums_1.ServiceState.MATCHING,
        ESCALATED_TO_ADMIN: enums_1.ServiceState.MATCHING,
        FULLY_ALLOCATED: enums_1.ServiceState.ASSIGNED,
        PHARMACY_RECEIVED: enums_1.ServiceState.ASSIGNED,
        ACCEPTED: enums_1.ServiceState.CONFIRMED,
        PHARMACY_ACCEPTED: enums_1.ServiceState.CONFIRMED,
        CONFIRMED: enums_1.ServiceState.CONFIRMED,
        PARTIALLY_CONFIRMED: enums_1.ServiceState.CONFIRMED,
        REJECTED: enums_1.ServiceState.CANCELLED,
        PARTIALLY_FULFILLED: enums_1.ServiceState.IN_PROGRESS,
        IN_FULFILLMENT: enums_1.ServiceState.IN_PROGRESS,
        PREPARING: enums_1.ServiceState.IN_PROGRESS,
        PHARMACY_PROCESSING: enums_1.ServiceState.IN_PROGRESS,
        READY_FOR_PICKUP: enums_1.ServiceState.IN_PROGRESS,
        READY_FOR_DISPATCH: enums_1.ServiceState.IN_PROGRESS,
        ASSIGNED_TO_DELIVERY: enums_1.ServiceState.IN_PROGRESS,
        OUT_FOR_DELIVERY: enums_1.ServiceState.IN_PROGRESS,
        DELIVERED: enums_1.ServiceState.COMPLETED,
        COMPLETED: enums_1.ServiceState.COMPLETED,
        EXPIRED: enums_1.ServiceState.CANCELLED,
        CANCELLED: enums_1.ServiceState.CANCELLED,
    },
    lab: {
        CREATED: enums_1.ServiceState.REQUESTED,
        NEW_REQUEST: enums_1.ServiceState.REQUESTED,
        PENDING_PAYMENT: enums_1.ServiceState.REQUESTED,
        PENDING_INSURANCE: enums_1.ServiceState.REQUESTED,
        WAITING_COPAY: enums_1.ServiceState.REQUESTED,
        CONFIRMED: enums_1.ServiceState.CONFIRMED,
        SCHEDULED: enums_1.ServiceState.CONFIRMED,
        IN_TRANSIT: enums_1.ServiceState.IN_PROGRESS,
        SAMPLE_COLLECTED: enums_1.ServiceState.IN_PROGRESS,
        PROCESSING: enums_1.ServiceState.IN_PROGRESS,
        IN_LAB: enums_1.ServiceState.IN_PROGRESS,
        RESULT_READY: enums_1.ServiceState.IN_PROGRESS,
        RESULT_UPLOADED: enums_1.ServiceState.IN_PROGRESS,
        SAMPLE_REJECTED: enums_1.ServiceState.IN_PROGRESS,
        REPORTED: enums_1.ServiceState.COMPLETED,
        REPORT_READY: enums_1.ServiceState.COMPLETED,
        CANCELLED: enums_1.ServiceState.CANCELLED,
    },
    radiology: {
        PENDING: enums_1.ServiceState.REQUESTED,
        CREATED: enums_1.ServiceState.REQUESTED,
        NEW_REQUEST: enums_1.ServiceState.REQUESTED,
        PENDING_PAYMENT: enums_1.ServiceState.REQUESTED,
        PENDING_INSURANCE: enums_1.ServiceState.REQUESTED,
        WAITING_COPAY: enums_1.ServiceState.REQUESTED,
        CONFIRMED: enums_1.ServiceState.CONFIRMED,
        SCHEDULED: enums_1.ServiceState.CONFIRMED,
        ARRIVED_CHECKIN: enums_1.ServiceState.IN_PROGRESS,
        IN_PROGRESS: enums_1.ServiceState.IN_PROGRESS,
        IN_SCANNING: enums_1.ServiceState.IN_PROGRESS,
        IMAGING_DONE: enums_1.ServiceState.IN_PROGRESS,
        REPORT_DRAFT: enums_1.ServiceState.IN_PROGRESS,
        UNDER_REVIEW: enums_1.ServiceState.IN_PROGRESS,
        REPORT_READY: enums_1.ServiceState.COMPLETED,
        REPORT_PUBLISHED: enums_1.ServiceState.COMPLETED,
        COMPLETED: enums_1.ServiceState.COMPLETED,
        SCAN_ABORTED: enums_1.ServiceState.CANCELLED,
        CANCELLED: enums_1.ServiceState.CANCELLED,
    },
    nursing: {
        NEW_REQUEST: enums_1.ServiceState.REQUESTED,
        CREATED: enums_1.ServiceState.REQUESTED,
        REQUESTED: enums_1.ServiceState.REQUESTED,
        BROADCASTING: enums_1.ServiceState.MATCHING,
        OFFERED: enums_1.ServiceState.MATCHING,
        ASSIGNED: enums_1.ServiceState.ASSIGNED,
        PROVIDER_ASSIGNED: enums_1.ServiceState.ASSIGNED,
        NURSE_CONFIRMED: enums_1.ServiceState.CONFIRMED,
        CONFIRMED: enums_1.ServiceState.CONFIRMED,
        EN_ROUTE: enums_1.ServiceState.IN_PROGRESS,
        IN_TRANSIT: enums_1.ServiceState.IN_PROGRESS,
        ARRIVED: enums_1.ServiceState.IN_PROGRESS,
        CARE_IN_PROGRESS: enums_1.ServiceState.IN_PROGRESS,
        ON_THE_WAY: enums_1.ServiceState.IN_PROGRESS,
        IN_PROGRESS: enums_1.ServiceState.IN_PROGRESS,
        COMPLETED: enums_1.ServiceState.COMPLETED,
        NO_SHOW: enums_1.ServiceState.CANCELLED,
        ESCALATED_EMERGENCY: enums_1.ServiceState.CANCELLED,
        CANCELLED: enums_1.ServiceState.CANCELLED,
    },
    consultation: {
        PENDING: enums_1.ServiceState.REQUESTED,
        REQUESTED: enums_1.ServiceState.REQUESTED,
        RESCHEDULED: enums_1.ServiceState.CONFIRMED,
        SCHEDULED: enums_1.ServiceState.CONFIRMED,
        CONFIRMED: enums_1.ServiceState.CONFIRMED,
        ASSIGNED: enums_1.ServiceState.ASSIGNED,
        CHECKED_IN: enums_1.ServiceState.IN_PROGRESS,
        IN_PROGRESS: enums_1.ServiceState.IN_PROGRESS,
        ONGOING: enums_1.ServiceState.IN_PROGRESS,
        COMPLETED: enums_1.ServiceState.COMPLETED,
        NO_SHOW: enums_1.ServiceState.CANCELLED,
        CANCELLED: enums_1.ServiceState.CANCELLED,
    },
};
function toUniversal(kind, domainState) {
    const normalized = String(domainState || '').trim().toUpperCase();
    const mapped = exports.STATE_MAP[kind]?.[normalized];
    if (!mapped)
        throw new common_1.BadRequestException({ error: 'unknown_domain_state', kind, domain_state: domainState });
    return mapped;
}
function domainStatesFor(kind, universal) {
    const m = exports.STATE_MAP[kind] || {};
    return Object.keys(m).filter(k => m[k] === universal);
}
let WorkflowEngineService = class WorkflowEngineService {
    constructor(orders, labs, rads, providers, facilityModel, bus) {
        this.orders = orders;
        this.labs = labs;
        this.rads = rads;
        this.providers = providers;
        this.facilityModel = facilityModel;
        this.bus = bus;
    }
    validate(kind, fromDomain, toDomain) {
        const from = toUniversal(kind, fromDomain);
        const to = toUniversal(kind, toDomain);
        if (from === to)
            return { from, to };
        const allowed = enums_1.UNIFIED_TRANSITIONS[from] || [];
        if (!allowed.includes(to)) {
            throw new common_1.BadRequestException({
                error: 'invalid_transition',
                kind, from_domain: fromDomain, to_domain: toDomain,
                from_universal: from, to_universal: to,
                allowed_next: allowed,
            });
        }
        return { from, to };
    }
    universalEventType(to) {
        return {
            [enums_1.ServiceState.REQUESTED]: 'service.requested',
            [enums_1.ServiceState.MATCHING]: 'service.matched',
            [enums_1.ServiceState.ASSIGNED]: 'service.assigned',
            [enums_1.ServiceState.CONFIRMED]: 'service.confirmed',
            [enums_1.ServiceState.IN_PROGRESS]: 'service.started',
            [enums_1.ServiceState.COMPLETED]: 'service.completed',
            [enums_1.ServiceState.CANCELLED]: 'service.cancelled',
        }[to];
    }
    entityType(kind) {
        return {
            pharmacy: 'order',
            lab: 'lab_booking',
            radiology: 'radiology_booking',
            nursing: 'nursing_booking',
            consultation: 'appointment',
        }[kind];
    }
    async apply(args) {
        const map = this.validate(args.kind, args.from_domain, args.to_domain);
        try {
            const result = await args.mutate();
            this.bus.emit({
                type: this.universalEventType(map.to),
                entity_type: this.entityType(args.kind),
                entity_id: args.entity_id,
                actor_account_id: args.actor_account_id,
                actor_role: args.actor_role,
                patient_account_id: args.patient_account_id,
                reason_code: args.reason,
                meta: {
                    kind: args.kind,
                    from_universal: map.from,
                    to_universal: map.to,
                    from_domain: args.from_domain,
                    to_domain: args.to_domain,
                    ...args.meta,
                },
            }).catch(() => null);
            return result;
        }
        catch (err) {
            await this.bus.emit({
                type: 'service.rollback',
                entity_type: this.entityType(args.kind),
                entity_id: args.entity_id,
                actor_account_id: args.actor_account_id,
                actor_role: args.actor_role,
                meta: {
                    kind: args.kind,
                    attempted_from: args.from_domain,
                    attempted_to: args.to_domain,
                    error: String(err?.message || err),
                    universal_from: map.from,
                    universal_to: map.to,
                },
            }).catch(() => null);
            throw err;
        }
    }
    async transition(args) {
        return this.apply(args);
    }
    async announceCreated(args) {
        this.bus.emit({
            type: 'service.requested',
            entity_type: this.entityType(args.kind),
            entity_id: args.entity_id,
            actor_account_id: args.actor_account_id,
            actor_role: args.actor_role,
            patient_account_id: args.patient_account_id,
            meta: { kind: args.kind, to_universal: enums_1.ServiceState.REQUESTED, ...(args.meta || {}) },
        }).catch(() => null);
    }
    async rankProviders(criteria) {
        const typeMap = {
            pharmacy: 'pharmacy', lab: 'lab', radiology: 'radiology',
            nursing: 'home_care', consultation: 'doctor',
        };
        const ptype = typeMap[criteria.kind];
        const filter = { status: enums_1.ProviderStatus.ACTIVE };
        if (ptype)
            filter.type = ptype;
        if (criteria.home_visit)
            filter.home_visit_supported = true;
        if (criteria.city)
            filter.city = criteria.city;
        if (criteria.insurance)
            filter.accepted_insurance = criteria.insurance;
        const candidates = await this.providers
            .find(filter, { _id: 0, __v: 0, license_documents: 0 })
            .limit(120)
            .lean();
        const scoredPromises = candidates.map(async (p) => {
            let insuranceMatch = true;
            let hasCompany = true;
            let hasNetwork = true;
            let hasClass = true;
            const contracts = p.insurance_contracts || [];
            if (criteria.insurance_company) {
                hasCompany = (p.accepted_insurance || []).map((x) => x.toLowerCase()).includes(criteria.insurance_company.toLowerCase()) ||
                    contracts.some(c => c.company_id.toLowerCase() === criteria.insurance_company.toLowerCase());
            }
            if (criteria.insurance_network) {
                hasNetwork = contracts.some(c => c.network_id.toLowerCase() === criteria.insurance_network.toLowerCase());
            }
            if (criteria.insurance_class && criteria.insurance_network) {
                hasClass = contracts.some(c => c.network_id.toLowerCase() === criteria.insurance_network.toLowerCase() &&
                    (c.covered_classes.length === 0 || c.covered_classes.map((x) => x.toLowerCase()).includes(criteria.insurance_class.toLowerCase())));
            }
            if (criteria.accepts_insurance) {
                const accepts = p.accepts_insurance || (p.accepted_insurance || []).length > 0 || contracts.length > 0;
                if (!accepts)
                    insuranceMatch = false;
            }
            if (criteria.insurance_company || criteria.insurance_network || criteria.insurance_class) {
                insuranceMatch = insuranceMatch && hasCompany && hasNetwork && hasClass;
            }
            let facilityMatch = true;
            if (criteria.facility_accepts_insurance && p.facility_id) {
                const fac = await this.facilityModel.findOne({ id: p.facility_id }).lean();
                if (!fac) {
                    facilityMatch = false;
                }
                else {
                    const facContracts = fac.insurance_contracts || [];
                    const facAccepts = fac.accepts_insurance || (fac.accepted_insurance || []).length > 0 || facContracts.length > 0;
                    if (!facAccepts) {
                        facilityMatch = false;
                    }
                    else if (criteria.insurance_company) {
                        const facCompanyMatch = (fac.accepted_insurance || []).map((x) => x.toLowerCase()).includes(criteria.insurance_company.toLowerCase()) ||
                            facContracts.some(c => c.company_id.toLowerCase() === criteria.insurance_company.toLowerCase());
                        if (!facCompanyMatch)
                            facilityMatch = false;
                    }
                }
            }
            if (!insuranceMatch || !facilityMatch)
                return null;
            const totalCriteria = (criteria.service_keys?.length || 0) +
                (criteria.service_ids?.length || 0) +
                (criteria.specialty ? 1 : 0) || 1;
            let matched = 0;
            if (criteria.specialty) {
                const sp = criteria.specialty.toLowerCase();
                if (p.specialty?.toLowerCase().includes(sp))
                    matched++;
                if ((p.sub_specialties || []).some((s) => s.toLowerCase().includes(sp)))
                    matched++;
            }
            for (const k of criteria.service_keys || []) {
                const kl = k.toLowerCase();
                if ((p.nursing_services || []).some((ns) => (ns.key || '').toLowerCase() === kl))
                    matched++;
                if ((p.test_categories || []).some((tc) => tc.toLowerCase().includes(kl)))
                    matched++;
                if ((p.equipment_list || []).some((eq) => eq.toLowerCase().includes(kl)))
                    matched++;
            }
            const cap = Math.min(40, (matched / totalCriteria) * 40);
            let ins = 0;
            if (criteria.insurance_company) {
                ins = 20;
            }
            else if (criteria.insurance) {
                ins = (p.accepted_insurance || []).includes(criteria.insurance) ? 20 : (p.accepts_insurance ? 8 : 0);
            }
            else {
                ins = p.accepts_insurance ? 8 : 0;
            }
            const avail = Math.min(25, (p.is_online !== false ? 15 : 5) +
                ((p.working_hours && Object.keys(p.working_hours).length) ? 10 : 0));
            let dist = 0;
            let km = null;
            if (criteria.location && p.location?.lat && p.location?.lng) {
                km = haversine(criteria.location.lat, criteria.location.lng, p.location.lat, p.location.lng);
                const radius = p.coverage_radius_km || 10;
                if (km <= radius)
                    dist = Math.max(0, 15 - km * (15 / Math.max(1, radius)));
            }
            else {
                dist = 7;
            }
            const total = Math.round(cap + ins + avail + dist);
            return {
                ...p,
                distance_km: km !== null ? Math.round(km * 10) / 10 : null,
                _score: {
                    total,
                    capability: Math.round(cap),
                    insurance: ins,
                    availability: avail,
                    distance: Math.round(dist),
                },
            };
        });
        const scoredResults = await Promise.all(scoredPromises);
        const scored = scoredResults.filter(x => x !== null);
        scored.sort((a, b) => b._score.total - a._score.total);
        return scored.slice(0, criteria.max_results || 30);
    }
    async orchestrate(args) {
        const trace_id = `${args.kind}-${args.patient_account_id.slice(0, 6)}-${Date.now()}`;
        await this.bus.emit({
            type: 'service.requested',
            entity_type: 'orchestration',
            entity_id: trace_id,
            actor_account_id: args.patient_account_id,
            actor_role: 'patient',
            meta: { ...args, to_universal: enums_1.ServiceState.REQUESTED },
        }).catch(() => null);
        await this.bus.emit({
            type: 'service.matched',
            entity_type: 'orchestration',
            entity_id: trace_id,
            actor_role: 'system',
            meta: { kind: args.kind, to_universal: enums_1.ServiceState.MATCHING },
        }).catch(() => null);
        const ranked = await this.rankProviders(args);
        return { trace_id, providers: ranked, universal_state: enums_1.ServiceState.MATCHING };
    }
    toUniversalView(kind, domainState) {
        return toUniversal(kind, domainState);
    }
};
exports.WorkflowEngineService = WorkflowEngineService;
exports.WorkflowEngineService = WorkflowEngineService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Order')),
    __param(1, (0, mongoose_1.InjectModel)('LabBooking')),
    __param(2, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(3, (0, mongoose_1.InjectModel)('ProviderProfile')),
    __param(4, (0, mongoose_1.InjectModel)('Facility')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        event_bus_service_1.EventBusService])
], WorkflowEngineService);
let WorkflowController = class WorkflowController {
    constructor(engine) {
        this.engine = engine;
    }
    lifecycle() {
        return {
            states: Object.values(enums_1.ServiceState),
            transitions: enums_1.UNIFIED_TRANSITIONS,
            kind_state_map: exports.STATE_MAP,
            events: [
                'service.requested',
                'service.matched',
                'service.assigned',
                'service.confirmed',
                'service.started',
                'service.completed',
                'service.cancelled',
                'service.rollback',
            ],
        };
    }
    universal(kind, state) {
        return { kind, domain_state: state, universal_state: toUniversal(kind, state) };
    }
    match(b) {
        return this.engine.rankProviders({
            kind: b.kind,
            service_keys: b.service_keys,
            service_ids: b.service_ids,
            specialty: b.specialty,
            insurance: b.insurance,
            insurance_company: b.insurance_company,
            insurance_network: b.insurance_network,
            insurance_class: b.insurance_class,
            accepts_insurance: b.accepts_insurance,
            facility_accepts_insurance: b.facility_accepts_insurance,
            home_visit: b.home_visit,
            city: b.city,
            location: b.location,
            max_results: b.max_results,
        });
    }
    debug() {
        return exports.STATE_MAP;
    }
};
exports.WorkflowController = WorkflowController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('lifecycle'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "lifecycle", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('universal'),
    __param(0, (0, common_1.Query)('kind')),
    __param(1, (0, common_1.Query)('state')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "universal", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('match'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "match", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, common_1.Get)('debug/state-map'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "debug", null);
exports.WorkflowController = WorkflowController = __decorate([
    (0, common_1.Controller)('workflow'),
    __metadata("design:paramtypes", [WorkflowEngineService])
], WorkflowController);
function haversine(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
let WorkflowEngineModule = class WorkflowEngineModule {
};
exports.WorkflowEngineModule = WorkflowEngineModule;
exports.WorkflowEngineModule = WorkflowEngineModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'LabBooking', schema: lab_schema_1.LabBookingSchema },
                { name: 'RadiologyBooking', schema: radiology_schema_1.RadiologyBookingSchema },
                { name: 'ProviderProfile', schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: 'Facility', schema: facility_schema_1.FacilitySchema },
            ])],
        controllers: [WorkflowController],
        providers: [WorkflowEngineService],
        exports: [WorkflowEngineService],
    })
], WorkflowEngineModule);
//# sourceMappingURL=workflow-engine.module.js.map