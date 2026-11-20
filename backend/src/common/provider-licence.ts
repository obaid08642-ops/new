import { BadRequestException } from '@nestjs/common';
import { marketDayStart, marketParts } from './market-time';

/**
 * Provider licence expiry, rule A2 (owner decision 2026-11-17, lead): a licence is valid THROUGH the end of its expiry day, in the market's time (Riyadh, `common/market-time.ts`), and is lapsed from
 * the first instant of the next day, for ALL provider types at once (doctor, pharmacy, lab, radiology, nursing/home care, facilities), not only doctors. Before this, the daily monitor treated a date
 * stored as midnight UTC as expired from the start of its own day (03:00 Riyadh), and only doctor bookings had an instant check.
 */
export const LICENCE_EXPIRED = 'provider_license_expired';
const DAY_MS = 86_400_000;

/**
 * The first instant the licence is no longer valid, or null when there is no (valid) date. A date typed as a calendar day is stored as midnight UTC ("2026-12-31T00:00:00Z"): that is the DAY
 * 2026-12-31; any other time of day is read as the instant it is, in the market's calendar.
 */
export function licenceLapseInstant(expiry: unknown): Date | null {
  if (expiry === null || expiry === undefined || expiry === '') return null;
  const d = new Date(expiry as any);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0 ? d.toISOString().slice(0, 10) : marketParts(d).date;
  const next = new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
  return marketDayStart(next);
}

/** True when the licence has lapsed at `now`. No date = not lapsed here (a missing date is the approval step's business, not an instant block). */
export function isLicenceLapsed(expiry: unknown, now: number = Date.now()): boolean {
  const at = licenceLapseInstant(expiry);
  return at !== null && now >= at.getTime();
}

/** Whole days until the licence lapses (>= 1 while valid today), for the warnings; <= 0 once lapsed. */
export function licenceDaysLeft(expiry: unknown, now: number = Date.now()): number | null {
  const at = licenceLapseInstant(expiry);
  return at === null ? null : Math.ceil((at.getTime() - now) / DAY_MS);
}

/** The minimum of a database handle this needs (a mongoose connection's `db` or a native Db). */
export interface ProfileReader { collection(name: string): { findOne(filter: any, options?: any): Promise<any> } }

/** Refuse a NEW booking / order / offer for a provider whose licence has lapsed. A provider with no profile or no date passes (their own gates decide). */
export async function assertProviderLicenceCurrent(db: ProfileReader | undefined | null, accountId: string | undefined | null, now: number = Date.now()): Promise<void> {
  if (!db || !accountId) return;
  const profile = await db.collection('provider_profiles').findOne({ $or: [{ account_id: accountId }, { user_id: accountId }] }, { projection: { _id: 0, license_expiry_date: 1 } });
  if (profile && isLicenceLapsed(profile.license_expiry_date, now)) throw new BadRequestException(LICENCE_EXPIRED);
}
