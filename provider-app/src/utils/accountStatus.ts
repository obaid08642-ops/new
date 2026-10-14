/**
 * Maps the provider account status the server sends (`profile_status` of /provider/auth/login and /refresh, values of
 * ProviderAccountStatus in backend/src/modules/provider/provider.enums.ts) to the app state that decides which screen opens.
 * Only an approved account reaches the dashboard; every earlier state stays on the status screen.
 */
export type BlockedAccountState = 'pending' | 'needs_changes' | 'rejected' | 'suspended';
export type AccountAppState = 'logged_in' | BlockedAccountState;

const PENDING_LIKE = new Set([
  'pending', 'pending_admin_approval', 'under_review', 'submitted',
  'onboarding', 'email_unverified', 'email_verified',
]);

export function mapAccountStatus(status: string | undefined | null): AccountAppState {
  const s = String(status || '').toLowerCase();
  if (s === 'suspended') return 'suspended';
  if (s === 'rejected') return 'rejected';
  if (s === 'needs_changes') return 'needs_changes';
  if (PENDING_LIKE.has(s)) return 'pending';
  // approved / active, and any value this app does not know (the server enum is closed): the server stays the gate.
  return 'logged_in';
}

export interface ProgressResponse {
  started?: boolean; status?: string;
  rejected_reason?: string; rejection_reason?: string; suspended_reason?: string; suspension_reason?: string;
  review_note?: string; admin_note?: string;
}

/** The text the reviewer left on the profile, whatever field the server used (GET /provider-onboarding/progress returns the whole profile). */
export function reasonFromProgress(p: ProgressResponse | null | undefined): string {
  if (!p) return '';
  return String(p.rejected_reason || p.rejection_reason || p.suspended_reason || p.suspension_reason || p.review_note || p.admin_note || '').trim();
}
