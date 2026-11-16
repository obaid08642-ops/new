/**
 * Why a booking was cancelled, for the patient's view (needs-review m6-ord08-10: "a booking the provider declines is not distinguishable from a patient cancel; a timeout, a free cancel and any other
 * cancel look the same"). Derived from what the booking already stores: the LAST state-history entry that moved it to CANCELLED (`by_role`, `note`). Nothing new is written.
 */
export type CancelReason = 'provider_did_not_confirm' | 'patient_cancelled' | 'provider_cancelled' | 'admin_cancelled' | 'system_cancelled';

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'support']);

export function cancelReasonOf(b: { state?: unknown; status?: unknown; state_history?: unknown }): CancelReason | null {
  const cancelled = String(b?.state ?? '').toUpperCase() === 'CANCELLED' || String(b?.status ?? '').toLowerCase().startsWith('cancelled');
  if (!cancelled) return null;
  if (String(b?.status ?? '') === 'cancelled_unconfirmed') return 'provider_did_not_confirm';
  const history = Array.isArray(b?.state_history) ? (b.state_history as Array<Record<string, unknown>>) : [];
  const last = [...history].reverse().find((h) => String(h?.to ?? '').toUpperCase() === 'CANCELLED');
  if (!last) return null;
  if (String(last.note ?? '') === 'confirm_deadline_passed') return 'provider_did_not_confirm';
  const role = String(last.by_role ?? '').toLowerCase();
  if (role === 'patient') return 'patient_cancelled';
  if (ADMIN_ROLES.has(role)) return 'admin_cancelled';
  if (role === 'system') return 'system_cancelled';
  return role ? 'provider_cancelled' : null;
}
