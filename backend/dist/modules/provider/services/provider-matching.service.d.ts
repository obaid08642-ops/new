import { ProviderRequestType, ProviderRequestPriority } from '../schemas/requests.schema';
import { GeoEngineService, LatLng } from './geo-engine.service';
import { ServiceCapabilityService } from './service-capability.service';
import { SchedulingEngineService } from './scheduling-engine.service';
import { ProviderScoringService } from './provider-scoring.service';
import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
import { ProviderAccountRepository } from "./repositories/provideraccount.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProviderAvailabilityRepository } from "./repositories/provideravailability.repository";
export interface MatchCandidate {
    provider_account_id: string;
    display_name?: string;
    provider_type: string;
    distance_km: number;
    in_zone: boolean;
    capacity_ok: boolean;
    availability: string;
    reliability_score: number;
    acceptance_rate: number;
    workload: number;
    capability_ok: boolean;
    capability_price?: number;
    priority_boost: number;
    total_score: number;
    breakdown: Record<string, number>;
    meta: any;
}
export interface MatchInput {
    type: ProviderRequestType | string;
    patient_location?: LatLng;
    payload?: any;
    priority?: ProviderRequestPriority;
    scheduled_at?: Date;
    duration_minutes?: number;
    exclude_provider_ids?: string[];
    max_results?: number;
    required_provider_type?: string;
}
export declare class ProviderMatchingService {
    private requests;
    private accounts;
    private profiles;
    private avails;
    private readonly geo;
    private readonly capability;
    private readonly scheduling;
    private readonly scoring;
    private logger;
    constructor(requests: ProviderRequestRepository, accounts: ProviderAccountRepository, profiles: ProviderAccountProfileRepository, avails: ProviderAvailabilityRepository, geo: GeoEngineService, capability: ServiceCapabilityService, scheduling: SchedulingEngineService, scoring: ProviderScoringService);
    match(input: MatchInput): Promise<{
        candidates: MatchCandidate[];
        total_eligible: number;
        total_scanned: number;
    }>;
    matchForRequest(request_id: string, max_results?: number): Promise<{
        candidates: MatchCandidate[];
        total_eligible: number;
        total_scanned: number;
    }>;
}
