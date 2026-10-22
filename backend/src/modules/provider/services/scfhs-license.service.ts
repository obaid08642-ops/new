/**
 * 19.3 — SCFHS licence checks for doctors, nurses and pharmacists: at approval, at submission, and every day after.
 *
 * The lookup is an HTTPS call to the licence-verification service the owner configures:
 *   SCFHS_VERIFY_URL  e.g. https://verify.example/licenses   (called as GET <url>?license_number=<n>)
 *   SCFHS_API_KEY     sent as `Authorization: Bearer <key>`
 * and answers JSON `{ "found": boolean, "status": "active"|"expired"|"suspended"|"revoked", "expiry_date": "YYYY-MM-DD", "holder_name"?: string }`.
 * With no URL configured, or on any error, timeout or unreadable answer, the lookup is `unavailable`, which never verifies a provider.
 */
import { Injectable, Logger, Module } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { externalFetch } from '../../../common/external-call';
import { decideScfhs, LicenseDecision, ManualLicenseCheck, recheckVerdict, requiresScfhs, ScfhsResult, scfhsNumberOf } from '../../../common/scfhs-license';

const LOOKUP_TIMEOUT_MS = 5000;

@Injectable()
export class ScfhsLicenseService {
  private readonly logger = new Logger(ScfhsLicenseService.name);

  constructor(@InjectConnection() private readonly conn: Connection, private readonly events: EventEmitter2) {}

  configured(): boolean {
    return Boolean((process.env.SCFHS_VERIFY_URL || '').trim());
  }

  /** One lookup. Never throws: anything but a clear answer is `unavailable`. */
  async lookup(licenseNumber: string): Promise<ScfhsResult> {
    const checked_at = new Date();
    const url = (process.env.SCFHS_VERIFY_URL || '').trim();
    if (!url || !licenseNumber) return { outcome: 'unavailable', checked_at };
    try {
      const target = new URL(url);
      target.searchParams.set('license_number', licenseNumber);
      const key = (process.env.SCFHS_API_KEY || '').trim();
      const res = await externalFetch(target.toString(), { headers: { Accept: 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) } }, LOOKUP_TIMEOUT_MS);
      if (!res.ok) return { outcome: 'unavailable', checked_at };
      return parseAnswer(await res.json(), checked_at);
    } catch (e: any) {
      this.logger.warn(`SCFHS lookup failed: ${e?.message || e}`);
      return { outcome: 'unavailable', checked_at };
    }
  }

  /** The decision for approving this profile now (or the reason it cannot be approved). */
  async decideFor(profile: any, manual?: ManualLicenseCheck): Promise<{ decision: LicenseDecision; result: ScfhsResult | null; number: string }> {
    const number = scfhsNumberOf(profile);
    // No number to look up (a pharmacy form does not ask for the pharmacist's yet): only an admin's manual check can verify.
    const result: ScfhsResult = number ? await this.lookup(number) : { outcome: 'unavailable', checked_at: new Date() };
    const decision = decideScfhs(result, manual);
    if (!number && decision.reason === 'scfhs_unavailable_manual_check_required') decision.reason = 'scfhs_license_number_missing';
    return { decision, result: number ? result : null, number };
  }

  /** Store a decision on the profile; the provider is public only when it verified. */
  async store(profileFilter: Record<string, unknown>, decision: LicenseDecision, result: ScfhsResult | null, adminId?: string, manual?: ManualLicenseCheck) {
    const now = new Date();
    await this.conn.collection('provider_profiles').updateMany(profileFilter, {
      $set: {
        license_status: decision.license_status,
        license_verified: decision.verified,
        scfhs_checked_at: result?.checked_at || now,
        scfhs_check_outcome: result?.outcome || 'not_checked',
        scfhs_check_source: decision.source || null,
        ...(decision.expiry_date ? { license_expiry_date: decision.expiry_date } : {}),
        ...(result?.holder_name ? { scfhs_holder_name: result.holder_name } : {}),
        ...(decision.source === 'admin_manual' ? { scfhs_manual_check: { reference: manual?.reference, expiry_date: decision.expiry_date, by: adminId, at: now } } : {}),
        // A last good check, kept for the grace period of the daily re-check.
        ...(decision.verified && decision.source === 'scfhs_api' ? { scfhs_last_good_at: result?.checked_at || now } : {}),
      },
    });
  }

  /** At submission: run the check and keep the answer for the admin who reviews it. Does not approve anyone. */
  async recordAtSubmission(profile: any): Promise<void> {
    if (!requiresScfhs(profile)) return;
    const { decision, result } = await this.decideFor(profile);
    // Submitting approves nobody: even a confirmed licence stays pending until an admin approves.
    await this.store({ id: profile.id }, { ...decision, verified: false, license_status: decision.verified ? 'pending_verification' : decision.license_status }, result);
  }

  /** Daily: re-check every public licensed provider and hide the ones whose licence is no longer good. */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async dailyRecheck(): Promise<{ checked: number; hidden: number }> {
    if (!this.configured()) return { checked: 0, hidden: 0 };
    const graceDays = Number(process.env.SCFHS_RECHECK_GRACE_DAYS) || 14;
    const profiles = await this.conn.collection('provider_profiles').find({
      status: 'active', public_eligibility: true, scfhs_check_source: 'scfhs_api',
    }).limit(5000).toArray();
    let checked = 0; let hidden = 0;
    for (const p of profiles as any[]) {
      const number = scfhsNumberOf(p);
      if (!number) continue;
      const result = await this.lookup(number);
      checked += 1;
      if (recheckVerdict(result, p.scfhs_last_good_at, graceDays) === 'keep') {
        if (result.outcome === 'active') {
          await this.conn.collection('provider_profiles').updateOne({ _id: p._id }, { $set: { scfhs_checked_at: result.checked_at, scfhs_last_good_at: result.checked_at, license_expiry_date: result.expiry_date, scfhs_check_outcome: 'active' } });
        }
        continue;
      }
      await this.hide(p, result);
      hidden += 1;
    }
    return { checked, hidden };
  }

  /** Take a provider off every public list and tell it why. */
  async hide(profile: any, result: ScfhsResult) {
    const status = result.outcome === 'suspended' ? 'suspended' : result.outcome === 'not_found' ? 'rejected' : 'expired';
    await this.conn.collection('provider_profiles').updateOne({ _id: profile._id }, {
      $set: {
        status: 'suspended', suspended_reason: `scfhs_license_${result.outcome}`, suspended_at: new Date(),
        public_eligibility: false, indexing_eligibility: false, license_verified: false, license_status: status,
        scfhs_checked_at: result.checked_at, scfhs_check_outcome: result.outcome,
      },
    });
    this.events.emit('provider.license_lapsed', { provider_id: profile.account_id || profile.user_id, profile_id: profile.id, outcome: result.outcome });
    this.logger.warn(`Provider ${profile.id} hidden: SCFHS licence ${result.outcome}`);
  }
}

function parseAnswer(body: any, checked_at: Date): ScfhsResult {
  if (!body || typeof body !== 'object' || typeof body.found !== 'boolean') return { outcome: 'unavailable', checked_at };
  if (!body.found) return { outcome: 'not_found', checked_at };
  const status = String(body.status || '').toLowerCase();
  const holder_name = typeof body.holder_name === 'string' ? body.holder_name : undefined;
  const expiry = new Date(String(body.expiry_date ?? ''));
  const expiry_date = Number.isNaN(expiry.getTime()) ? undefined : expiry;
  if (status === 'active') return { outcome: expiry_date ? 'active' : 'unavailable', expiry_date, holder_name, checked_at };
  if (status === 'expired') return { outcome: 'expired', expiry_date, holder_name, checked_at };
  if (status === 'suspended' || status === 'revoked') return { outcome: 'suspended', holder_name, checked_at };
  return { outcome: 'unavailable', checked_at };
}

export { parseAnswer as parseScfhsAnswer };


@Module({ providers: [ScfhsLicenseService], exports: [ScfhsLicenseService] })
export class ScfhsLicenseModule {}
