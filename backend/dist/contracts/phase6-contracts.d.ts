export declare const PHASE6_CONTRACT_STATUS: "DRAFT_NOT_ACTIVE";
export declare const CONSENT_SCOPES: readonly ["care:read", "care:write", "documents:read", "location:share:emergency", "notifications:receive"];
export type ConsentScope = (typeof CONSENT_SCOPES)[number];
export type ConsentStatus = 'granted' | 'revoked' | 'expired';
export interface ConsentDraft {
    id: string;
    subject_id: string;
    actor_id: string;
    actor_role: string;
    scope: ConsentScope[];
    purpose: string;
    status: ConsentStatus;
    version: string;
    granted_at: string;
    expires_at: string | null;
    revoked_at: string | null;
    source: string;
    evidence?: {
        request_id?: string;
        app_version?: string;
        policy_version?: string;
    };
}
export interface QrVerificationDraft {
    v: string;
    kid: string;
    jti: string;
    iss: string;
    aud: string;
    sub: string;
    purpose: string;
    iat: string;
    exp: string;
    nonce?: string;
    resource_id: string;
    signature: string;
}
export interface EmergencyLocationDraft {
    emergency_id: string;
    captured_at: string;
    accuracy_m: number;
    coarse_lat: number;
    coarse_lng: number;
    source: 'gps' | 'network' | 'unavailable';
    consent_state: 'granted' | 'denied' | 'not_requested';
}
export declare const ERROR_CODE_REGISTRY_DRAFT: Readonly<{
    readonly AUTH_OTP_EXPIRED: {
        readonly category: "authentication";
        readonly http_status: 401;
        readonly retryable: false;
    };
    readonly AUTH_FORBIDDEN: {
        readonly category: "authorization";
        readonly http_status: 403;
        readonly retryable: false;
    };
    readonly AUTH_NOT_PARTICIPANT: {
        readonly category: "authorization";
        readonly http_status: 403;
        readonly retryable: false;
    };
    readonly RESOURCE_NOT_FOUND: {
        readonly category: "resource";
        readonly http_status: 404;
        readonly retryable: false;
    };
    readonly PAYMENT_WEBHOOK_INVALID: {
        readonly category: "payment";
        readonly http_status: 400;
        readonly retryable: false;
    };
    readonly SECURITY_REPLAY_DETECTED: {
        readonly category: "security";
        readonly http_status: 409;
        readonly retryable: false;
    };
    readonly CONSENT_CONTRACT_NOT_ACTIVE: {
        readonly category: "contract";
        readonly http_status: 501;
        readonly retryable: false;
    };
    readonly QR_CONTRACT_NOT_ACTIVE: {
        readonly category: "contract";
        readonly http_status: 501;
        readonly retryable: false;
    };
    readonly EMERGENCY_LOCATION_CONTRACT_NOT_ACTIVE: {
        readonly category: "contract";
        readonly http_status: 501;
        readonly retryable: false;
    };
}>;
export declare function assertPhase6ContractInactive(contract: keyof typeof ERROR_CODE_REGISTRY_DRAFT): never;
