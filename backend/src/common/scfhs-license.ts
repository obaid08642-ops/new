/**
 * 19.3 — SCFHS professional licence rules (pure, no I/O).
 *
 * Doctors, nurses and pharmacists must hold a live SCFHS licence to be public. The rules fail closed:
 * only a confirmed, unexpired licence verifies a provider; "could not check" never does.
 */
import { ProviderType } from './enums';

export type ScfhsOutcome = 'active' | 'expired' | 'suspended' | 'not_found' | 'unavailable';

export type ScfhsResult = {
  outcome: ScfhsOutcome;
  expiry_date?: Date;
  holder_name?: string;
  checked_at: Date;
};

/** What an admin enters after checking the licence by hand (while the SCFHS service is not configured or down). */
export type ManualLicenseCheck = { reference: string; expiry_date: string };

export type LicenseDecision = {
  /** May the provider be approved / stay public on this evidence? */
  verified: boolean;
  /** Value for `license_status`. */
  license_status: 'verified' | 'expired' | 'suspended' | 'rejected' | 'pending_verification';
  /** Why not, as the error code returned to the admin. */
  reason?: 'scfhs_license_expired' | 'scfhs_license_suspended' | 'scfhs_license_not_found' | 'scfhs_unavailable_manual_check_required' | 'scfhs_license_number_missing' | 'manual_check_invalid';
  expiry_date?: Date;
  source?: 'scfhs_api' | 'admin_manual';
};

/** Practitioner types whose approval depends on an SCFHS licence. */
const SCFHS_TYPES = new Set<string>([ProviderType.DOCTOR, ProviderType.NURSING, ProviderType.HOME_CARE, ProviderType.PHARMACY]);

/**
 * Doctors, pharmacists (the pharmacy's responsible pharmacist) and individual nurses. A nursing company is
 * licensed by its commercial registration and the Ministry of Health, not by SCFHS, so it is not held to this rule.
 */
export function requiresScfhs(profile: any): boolean {
  const type = String(profile?.type || profile?.provider_type || '').toLowerCase();
  if (!SCFHS_TYPES.has(type)) return false;
  if (type === ProviderType.NURSING || type === ProviderType.HOME_CARE) {
    return Boolean(String(profile?.scfhs_license_number || '').trim()) || !String(profile?.cr_number || '').trim();
  }
  return true;
}

/** The SCFHS number on the profile. A pharmacy's general `license_number` is the facility licence, never an SCFHS one. */
export function scfhsNumberOf(profile: any): string {
  const own = typeof profile?.scfhs_license_number === 'string' ? profile.scfhs_license_number.trim() : '';
  if (own) return own;
  if (String(profile?.type || '').toLowerCase() === ProviderType.PHARMACY) return '';
  return typeof profile?.license_number === 'string' ? profile.license_number.trim() : '';
}

const DAY = 24 * 3600 * 1000;

function parseFutureDate(value: unknown, now: Date): Date | null {
  const d = new Date(String(value ?? ''));
  return Number.isNaN(d.getTime()) || d.getTime() <= now.getTime() ? null : d;
}

/**
 * Turn an SCFHS answer (or, when the service could not answer, an admin's manual check) into a decision.
 * A manual check needs a reference and a future expiry date, and is only used when the service is unavailable:
 * a clear "expired", "suspended" or "not found" from SCFHS is never overridden by hand.
 */
export function decideScfhs(result: ScfhsResult, manual: ManualLicenseCheck | undefined, now = new Date()): LicenseDecision {
  switch (result.outcome) {
    case 'active': {
      const expiry = result.expiry_date && result.expiry_date.getTime() > now.getTime() ? result.expiry_date : null;
      if (!expiry) return { verified: false, license_status: 'expired', reason: 'scfhs_license_expired' };
      return { verified: true, license_status: 'verified', expiry_date: expiry, source: 'scfhs_api' };
    }
    case 'expired': return { verified: false, license_status: 'expired', reason: 'scfhs_license_expired' };
    case 'suspended': return { verified: false, license_status: 'suspended', reason: 'scfhs_license_suspended' };
    case 'not_found': return { verified: false, license_status: 'rejected', reason: 'scfhs_license_not_found' };
    default: {
      if (!manual) return { verified: false, license_status: 'pending_verification', reason: 'scfhs_unavailable_manual_check_required' };
      const expiry = parseFutureDate(manual.expiry_date, now);
      if (!String(manual.reference || '').trim() || !expiry) return { verified: false, license_status: 'pending_verification', reason: 'manual_check_invalid' };
      return { verified: true, license_status: 'verified', expiry_date: expiry, source: 'admin_manual' };
    }
  }
}

/**
 * Re-check outcome for a provider that is already public. A confirmed bad answer hides the provider at once; an
 * unavailable service keeps the last good check until `graceDays` have passed since it, then hides (fail closed).
 */
export function recheckVerdict(result: ScfhsResult, lastGoodCheck: Date | null | undefined, graceDays: number, now = new Date()): 'keep' | 'hide' {
  if (result.outcome === 'active') {
    return result.expiry_date && result.expiry_date.getTime() > now.getTime() ? 'keep' : 'hide';
  }
  if (result.outcome !== 'unavailable') return 'hide';
  const last = lastGoodCheck ? new Date(lastGoodCheck).getTime() : 0;
  return last && now.getTime() - last <= graceDays * DAY ? 'keep' : 'hide';
}
