import { ProviderType } from '../../common/enums';

/** Provider types whose licence expiry (decision 37.4: an expired licence blocks the provider automatically) is stored and watched, besides doctors. */
export const LICENSED_FACILITY_TYPES: readonly string[] = [ProviderType.PHARMACY, ProviderType.HOSPITAL, ProviderType.LAB, ProviderType.RADIOLOGY, ProviderType.NURSING, ProviderType.HOME_CARE];

/**
 * What stops a pharmacy, hospital, lab, radiology centre or nursing provider from submitting: a licence expiry date that is already past is never
 * accepted; a missing one is refused only when PROVIDER_LICENSE_EXPIRY_REQUIRED=yes (the registration screens of these types did not send it
 * until their app release, so the requirement is switched on with that release, not before).
 */
export function facilityLicenseProblems(p: { type?: string; license_expiry_date?: unknown }, now = new Date(), required = process.env.PROVIDER_LICENSE_EXPIRY_REQUIRED === 'yes'): string[] {
  if (!LICENSED_FACILITY_TYPES.includes(String(p?.type))) return [];
  const raw = p.license_expiry_date;
  const expiry = raw ? new Date(raw as string | number | Date) : null;
  if (!expiry || Number.isNaN(expiry.getTime())) return required ? ['license_expiry_date_required'] : [];
  return expiry.getTime() <= now.getTime() ? ['license_already_expired'] : [];
}

/**
 * A lapsed licence hides the profile (the cron does that) and RESTRICTS the account (B2, owner 2026-11-17): the provider is not bookable and not listed, but the login keeps working so they can finish
 * existing work and upload the renewed licence. Returns the update for provider_accounts: status restricted with its history entry. No token_version bump: the open session stays valid.
 */
export function lapsedAccountUpdate(reason: string, from: string, at = new Date()): Record<string, unknown> {
  return {
    $set: { status: 'restricted', updatedAt: at },
    $push: { status_history: { from, to: 'restricted', by_user_id: 'system', by_role: 'system', at, note: reason } },
  };
}

/** Restrict the provider ACCOUNT behind a profile whose licence lapsed (only an approved account: an account already restricted, suspended, rejected or still in review is left alone). Returns whether it was changed. */
export async function restrictAccountForLicense(conn: { collection: (n: string) => any }, profile: { account_id?: string; user_id?: string }, reason: string): Promise<boolean> {
  const id = profile?.account_id || profile?.user_id;
  if (!id) return false;
  const accounts = conn.collection('provider_accounts');
  const account = await accounts.findOne({ $or: [{ id: String(id) }, { user_id: String(id) }] }, { projection: { id: 1, status: 1 } });
  if (!account || account.status !== 'approved') return false;
  const res = await accounts.updateOne({ id: account.id, status: 'approved' }, lapsedAccountUpdate(reason, 'approved'));
  return (res?.modifiedCount ?? 0) > 0;
}
