import { ProviderRequestType } from '../schemas/requests.schema';
import { AssignmentStrategy } from '../schemas/capabilities.schema';
import { ProviderMatchingService } from './provider-matching.service';
import { ProviderNotificationsService } from './provider-notifications.service';
import { ProviderScoringService } from './provider-scoring.service';
import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
import { ProviderAssignmentAttemptRepository } from "./repositories/providerassignmentattempt.repository";
export declare class AssignmentStrategyService {
    private requests;
    private attempts;
    private readonly matching;
    private readonly notifs;
    private readonly scoring;
    private logger;
    constructor(requests: ProviderRequestRepository, attempts: ProviderAssignmentAttemptRepository, matching: ProviderMatchingService, notifs: ProviderNotificationsService, scoring: ProviderScoringService);
    createAndDispatch(input: {
        type: ProviderRequestType;
        patient: any;
        payload: any;
        summary_ar?: string;
        summary_en?: string;
        amount_total?: number;
        priority?: any;
        scheduled_at?: Date;
        patient_location?: {
            lat: number;
            lng: number;
            address?: string;
        };
        strategy?: AssignmentStrategy;
        timeout_seconds?: number;
        seeded?: boolean;
    }): Promise<{
        request: any;
        dispatch: {
            ok: boolean;
            reason: string;
            request_id: string;
            strategy?: undefined;
            assigned_to?: undefined;
            expires_at?: undefined;
            candidates?: undefined;
            broadcasted_to?: undefined;
        } | {
            ok: boolean;
            strategy: any;
            assigned_to: string;
            expires_at: Date;
            candidates: import("./provider-matching.service").MatchCandidate[];
            reason?: undefined;
            request_id?: undefined;
            broadcasted_to?: undefined;
        } | {
            ok: boolean;
            strategy: any;
            broadcasted_to: string[];
            expires_at: Date;
            candidates: import("./provider-matching.service").MatchCandidate[];
            reason?: undefined;
            request_id?: undefined;
            assigned_to?: undefined;
        } | {
            ok: boolean;
            reason: string;
            request_id?: undefined;
            strategy?: undefined;
            assigned_to?: undefined;
            expires_at?: undefined;
            candidates?: undefined;
            broadcasted_to?: undefined;
        };
    }>;
    dispatch(request_id: string, timeout_seconds?: number): Promise<{
        ok: boolean;
        reason: string;
        request_id: string;
        strategy?: undefined;
        assigned_to?: undefined;
        expires_at?: undefined;
        candidates?: undefined;
        broadcasted_to?: undefined;
    } | {
        ok: boolean;
        strategy: any;
        assigned_to: string;
        expires_at: Date;
        candidates: import("./provider-matching.service").MatchCandidate[];
        reason?: undefined;
        request_id?: undefined;
        broadcasted_to?: undefined;
    } | {
        ok: boolean;
        strategy: any;
        broadcasted_to: string[];
        expires_at: Date;
        candidates: import("./provider-matching.service").MatchCandidate[];
        reason?: undefined;
        request_id?: undefined;
        assigned_to?: undefined;
    } | {
        ok: boolean;
        reason: string;
        request_id?: undefined;
        strategy?: undefined;
        assigned_to?: undefined;
        expires_at?: undefined;
        candidates?: undefined;
        broadcasted_to?: undefined;
    }>;
    manualAssign(user: any, request_id: string, provider_account_id: string): Promise<any>;
    onProviderRejected(request_id: string, provider_account_id: string, reason?: string): Promise<void>;
    onProviderAccepted(request_id: string, provider_account_id: string): Promise<void>;
    expireStale(): Promise<{
        expired: number;
        rerouted: number;
        scanned: any;
    }>;
    listAttempts(user: any, request_id: string): Promise<any>;
}
