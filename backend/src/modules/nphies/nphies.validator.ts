/**
 * NPHIES sandbox validator — genius-level: validates eligibility + approval code
 * before任何 insurance booking. Mock for now, ready for real NPHIES sandbox.
 */
export function validateNphies(policy: any, approvalCode?: string): { ok: boolean; reason?: string } {
  if (!policy?.nphies_eligible) return { ok: false, reason: 'nphies_not_eligible' };
  if (!approvalCode || !/^[A-Z0-9-]{6,20}$/.test(approvalCode)) return { ok: false, reason: 'nphies_approval_code_invalid' };
  return { ok: true };
}
