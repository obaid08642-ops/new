import { NotImplementedException } from '@nestjs/common';

/**
 * Phase 6 contract drafts are deliberately non-operational. These types document
 * the boundary without granting consent, verifying QR, collecting location, or
 * replacing the existing error behavior.
 */
export const PHASE6_CONTRACT_STATUS = 'DRAFT_NOT_ACTIVE' as const;

export const CONSENT_SCOPES = [
  'care:read',
  'care:write',
  'documents:read',
  'location:share:emergency',
  'notifications:receive',
] as const;

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
  evidence?: { request_id?: string; app_version?: string; policy_version?: string };
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

export const ERROR_CODE_REGISTRY_DRAFT = Object.freeze({
  AUTH_OTP_EXPIRED: { category: 'authentication', http_status: 401, retryable: false },
  AUTH_FORBIDDEN: { category: 'authorization', http_status: 403, retryable: false },
  AUTH_NOT_PARTICIPANT: { category: 'authorization', http_status: 403, retryable: false },
  RESOURCE_NOT_FOUND: { category: 'resource', http_status: 404, retryable: false },
  PAYMENT_WEBHOOK_INVALID: { category: 'payment', http_status: 400, retryable: false },
  SECURITY_REPLAY_DETECTED: { category: 'security', http_status: 409, retryable: false },
  CONSENT_CONTRACT_NOT_ACTIVE: { category: 'contract', http_status: 501, retryable: false },
  QR_CONTRACT_NOT_ACTIVE: { category: 'contract', http_status: 501, retryable: false },
  EMERGENCY_LOCATION_CONTRACT_NOT_ACTIVE: { category: 'contract', http_status: 501, retryable: false },
} as const);

export function assertPhase6ContractInactive(contract: keyof typeof ERROR_CODE_REGISTRY_DRAFT): never {
  const code = contract === 'CONSENT_CONTRACT_NOT_ACTIVE'
    ? 'CONSENT_CONTRACT_NOT_ACTIVE'
    : contract === 'QR_CONTRACT_NOT_ACTIVE'
      ? 'QR_CONTRACT_NOT_ACTIVE'
      : contract === 'EMERGENCY_LOCATION_CONTRACT_NOT_ACTIVE'
        ? 'EMERGENCY_LOCATION_CONTRACT_NOT_ACTIVE'
        : contract;
  throw new NotImplementedException(code);
}
