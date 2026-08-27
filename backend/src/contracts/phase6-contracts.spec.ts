import { NotImplementedException } from '@nestjs/common';
import {
  CONSENT_SCOPES,
  ERROR_CODE_REGISTRY_DRAFT,
  PHASE6_CONTRACT_STATUS,
  assertPhase6ContractInactive,
} from './phase6-contracts';

describe('Phase 6 contract drafts', () => {
  it('is explicitly non-active and exposes only conservative draft metadata', () => {
    expect(PHASE6_CONTRACT_STATUS).toBe('DRAFT_NOT_ACTIVE');
    expect(CONSENT_SCOPES).not.toContain('health:*');
    expect(ERROR_CODE_REGISTRY_DRAFT.CONSENT_CONTRACT_NOT_ACTIVE.http_status).toBe(501);
    expect(ERROR_CODE_REGISTRY_DRAFT.QR_CONTRACT_NOT_ACTIVE.http_status).toBe(501);
  });

  it('fails closed when a draft contract is requested', () => {
    expect(() => assertPhase6ContractInactive('CONSENT_CONTRACT_NOT_ACTIVE')).toThrow(NotImplementedException);
    expect(() => assertPhase6ContractInactive('QR_CONTRACT_NOT_ACTIVE')).toThrow(NotImplementedException);
    expect(() => assertPhase6ContractInactive('EMERGENCY_LOCATION_CONTRACT_NOT_ACTIVE')).toThrow(NotImplementedException);
  });
});
