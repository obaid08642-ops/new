import { NphiesService } from './nphies.service';

/**
 * NPHIES sandbox validator — validates eligibility + approval code
 * before any insurance booking. Uses real NPHIES sandbox integration.
 */
export async function validateNphies(
  nphiesService: NphiesService,
  nationalId: string,
  approvalCode?: string
): Promise<{ ok: boolean; reason?: string }> {
  if (!nationalId) return { ok: false, reason: 'national_id_required' };
  
  // If approval code provided, validate it
  if (approvalCode) {
    const valid = await nphiesService.validateApprovalCode(approvalCode, nationalId);
    if (!valid) return { ok: false, reason: 'nphies_approval_code_invalid' };
    return { ok: true };
  }
  
  // No approval code - check basic eligibility
  try {
    const result = await nphiesService.checkEligibility({
      national_id: nationalId,
      provider_code: 'nabdah',
      service_type: 'consultation',
    });
    
    if (!result.eligible) {
      return { ok: false, reason: 'nphies_not_eligible' };
    }
    return { ok: true };
  } catch {
    // On service error, fail closed for safety
    return { ok: false, reason: 'nphies_service_unavailable' };
  }
}
