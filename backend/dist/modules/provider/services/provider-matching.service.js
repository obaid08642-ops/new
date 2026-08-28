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
exports.ProviderMatchingService = void 0;
const common_1 = require("@nestjs/common");
const requests_schema_1 = require("../schemas/requests.schema");
const requests_schema_2 = require("../schemas/requests.schema");
const capabilities_schema_1 = require("../schemas/capabilities.schema");
const geo_engine_service_1 = require("./geo-engine.service");
const service_capability_service_1 = require("./service-capability.service");
const scheduling_engine_service_1 = require("./scheduling-engine.service");
const provider_scoring_service_1 = require("./provider-scoring.service");
const providerrequest_repository_1 = require("./repositories/providerrequest.repository");
const provideraccount_repository_1 = require("./repositories/provideraccount.repository");
const provideraccountprofile_repository_1 = require("./repositories/provideraccountprofile.repository");
const provideravailability_repository_1 = require("./repositories/provideravailability.repository");
let ProviderMatchingService = class ProviderMatchingService {
    constructor(requests, accounts, profiles, avails, geo, capability, scheduling, scoring) {
        this.requests = requests;
        this.accounts = accounts;
        this.profiles = profiles;
        this.avails = avails;
        this.geo = geo;
        this.capability = capability;
        this.scheduling = scheduling;
        this.scoring = scoring;
        this.logger = new common_1.Logger('ProviderMatching');
    }
    async match(input) {
        const reqType = input.type;
        const allowedProviderTypes = input.required_provider_type ? [input.required_provider_type] : (0, capabilities_schema_1.eligibleProviderTypesFor)(reqType);
        if (allowedProviderTypes.length === 0)
            return { candidates: [], total_eligible: 0, total_scanned: 0 };
        const accountFilter = {
            status: 'approved',
            provider_type: { $in: allowedProviderTypes },
        };
        if (input.exclude_provider_ids?.length)
            accountFilter.id = { $nin: input.exclude_provider_ids };
        const accounts = await this.accounts.find(accountFilter, { id: 1, provider_type: 1, email: 1 }).lean();
        if (accounts.length === 0)
            return { candidates: [], total_eligible: 0, total_scanned: 0 };
        const ids = accounts.map((a) => a.id);
        const profiles = await this.profiles.find({ account_id: { $in: ids } }).lean();
        const profileMap = new Map(profiles.map((p) => [p.account_id, p]));
        const availMap = new Map((await this.avails.find({ provider_account_id: { $in: ids } }).lean()).map((a) => [a.provider_account_id, a]));
        const scoresMap = await this.scoring.getForIds(ids);
        const candidates = [];
        for (const a of accounts) {
            const profile = profileMap.get(a.id);
            const avail = availMap.get(a.id);
            const scoreSnap = scoresMap[a.id] || {};
            const breakdown = {};
            const cap = await this.capability.hasCapabilityFor(a.id, String(reqType), input.payload || {});
            breakdown.capability = cap.ok ? 250 : 0;
            if (!cap.ok)
                continue;
            let distance_km = Number.POSITIVE_INFINITY;
            let in_zone = false;
            if (input.patient_location && profile?.geo?.lat != null) {
                distance_km = this.geo.distanceKm({ lat: profile.geo.lat, lng: profile.geo.lng }, input.patient_location);
                const zones = await this.capability.getZonesFor(a.id);
                in_zone = !!this.geo.matchZone(input.patient_location, zones);
                const radius = profile.geo.service_radius_km || 0;
                if (radius > 0 && distance_km > radius && !in_zone) {
                    breakdown.distance = 0;
                }
                else {
                    const norm = Math.max(0, 1 - distance_km / 50);
                    breakdown.distance = Math.round(200 * norm);
                }
            }
            else {
                breakdown.distance = input.patient_location ? 50 : 200;
            }
            breakdown.zone = in_zone ? 100 : 0;
            const aStatus = avail?.status || requests_schema_2.ProviderAvailabilityStatus.OFFLINE;
            const availPoints = {
                [requests_schema_2.ProviderAvailabilityStatus.ACCEPTING_ORDERS]: 150,
                [requests_schema_2.ProviderAvailabilityStatus.ONLINE]: 130,
                [requests_schema_2.ProviderAvailabilityStatus.BUSY]: 60,
                [requests_schema_2.ProviderAvailabilityStatus.OFFLINE]: 0,
            }[aStatus] || 0;
            breakdown.availability = availPoints;
            const reliability = scoreSnap.reliability_score || 0;
            breakdown.reliability = Math.round((reliability / 100) * 150);
            const workload = await this.scheduling.getWorkload(a.id);
            breakdown.workload = Math.round(100 * Math.max(0, 1 - Math.min(workload, 10) / 10));
            let priority_boost = 0;
            if (input.priority === requests_schema_1.ProviderRequestPriority.URGENT) {
                priority_boost = aStatus === requests_schema_2.ProviderAvailabilityStatus.ACCEPTING_ORDERS || aStatus === requests_schema_2.ProviderAvailabilityStatus.ONLINE ? 50 : 10;
            }
            breakdown.priority = priority_boost;
            let capacity_ok = true;
            let onDuty = false;
            if (input.scheduled_at) {
                const avail2 = await this.scheduling.checkAvailability(a.id, input.scheduled_at, input.duration_minutes || 30);
                capacity_ok = !!avail2.available;
                breakdown.scheduling = capacity_ok ? 50 : 0;
            }
            else {
                onDuty = await this.scheduling.isOnDuty(a.id);
                breakdown.scheduling = onDuty ? 30 : 10;
            }
            const total_score = Object.values(breakdown).reduce((s, v) => s + v, 0);
            candidates.push({
                provider_account_id: a.id,
                display_name: profile?.display_name_ar || profile?.legal_name || a.email,
                provider_type: a.provider_type,
                distance_km: Number.isFinite(distance_km) ? Math.round(distance_km * 10) / 10 : -1,
                in_zone,
                capacity_ok,
                availability: aStatus,
                reliability_score: reliability,
                acceptance_rate: scoreSnap.acceptance_rate || 0,
                workload,
                capability_ok: cap.ok,
                capability_price: cap.price,
                priority_boost,
                total_score,
                breakdown,
                meta: {
                    capability_items: cap.matched_items?.length || 0,
                },
            });
        }
        candidates.sort((a, b) => b.total_score - a.total_score);
        const limited = candidates.slice(0, input.max_results || 20);
        return { candidates: limited, total_eligible: candidates.length, total_scanned: accounts.length };
    }
    async matchForRequest(request_id, max_results = 10) {
        const r = await this.requests.findOne({ id: request_id }).lean();
        if (!r)
            throw new common_1.NotFoundException('request not found');
        return this.match({
            type: r.type,
            patient_location: r.patient_location,
            payload: r.payload,
            priority: r.priority,
            scheduled_at: r.scheduled_at,
            duration_minutes: r.payload?.duration_minutes || 30,
            exclude_provider_ids: r.attempted_provider_ids || [],
            max_results,
        });
    }
};
exports.ProviderMatchingService = ProviderMatchingService;
exports.ProviderMatchingService = ProviderMatchingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderRequestRepository')),
    __param(1, (0, common_1.Inject)('ProviderAccountRepository')),
    __param(2, (0, common_1.Inject)('ProviderAccountProfileRepository')),
    __param(3, (0, common_1.Inject)('ProviderAvailabilityRepository')),
    __metadata("design:paramtypes", [providerrequest_repository_1.ProviderRequestRepository,
        provideraccount_repository_1.ProviderAccountRepository,
        provideraccountprofile_repository_1.ProviderAccountProfileRepository,
        provideravailability_repository_1.ProviderAvailabilityRepository,
        geo_engine_service_1.GeoEngineService,
        service_capability_service_1.ServiceCapabilityService,
        scheduling_engine_service_1.SchedulingEngineService,
        provider_scoring_service_1.ProviderScoringService])
], ProviderMatchingService);
//# sourceMappingURL=provider-matching.service.js.map