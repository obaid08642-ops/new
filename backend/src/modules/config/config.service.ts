import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ClamavService } from '../storage/clamav.service';
import { StaleCache } from '../../common/stale-cache';

/**
 * The Council of Health Insurance's own page for a beneficiary to look up their insurance (checked on chi.gov.sa on
 * 2026-10-25: "الاستعلام عن معلومات التأمين الصحي"; it asks for the document number and a verification code, no fee).
 * The clients read it from /config, so a change of address needs no app release. Only an https chi.gov.sa address is
 * accepted from the environment; anything else falls back to this one.
 */
export const CHI_INQUIRY_URL = 'https://www.chi.gov.sa/ServicesDirectory/Pages/CheckInsurance.aspx';

export function chiInquiryUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = (env.CHI_INQUIRY_URL || '').trim();
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:' && (url.hostname === 'chi.gov.sa' || url.hostname.endsWith('.chi.gov.sa'))) return url.toString();
  } catch {
    // not a URL: use the default
  }
  return CHI_INQUIRY_URL;
}

@Injectable()
export class ConfigService {
  // The two database reads of /config (admin flag rows, app versions) are shared by every client: one load per TTL (single-flight),
  // and the last good copy while the database is slow or down. CONFIG_CACHE_MS=0 turns the TTL off (tests).
  private readonly dbPart = new StaleCache<{ rows: any[]; appVersions: Record<string, unknown> }>(async () => {
    const rows = await this.conn.collection('feature_flags').find({}, { maxTimeMS: 1500 }).project({ _id: 0, key: 1, enabled: 1, rollout_percentage: 1 }).toArray();
    const doc: any = await this.conn.collection('system_configs').findOne({ key: 'app_versions' }, { maxTimeMS: 1500 });
    return { rows: rows as any[], appVersions: doc?.value && typeof doc.value === 'object' ? doc.value : {} };
  }, () => { const n = Number(process.env.CONFIG_CACHE_MS); return Number.isFinite(n) && n >= 0 ? n : 5000; });

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly clamav: ClamavService,
  ) {}

  /**
   * Environment values provide the boot-safe baseline. Administrative flags
   * are then read from the canonical store and override that baseline, making
   * rollout controls effective for every client that consumes /config.
   */
  async getClientConfig() {
    // F37: video calls are advertised only when LiveKit is fully configured;
    // apps hide call buttons otherwise (no dead call button).
    const livekitReady = !!(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
    const featureFlags: Record<string, boolean> = Object.fromEntries(
      [
        ['telehealth', process.env.FEATURE_TELEHEALTH],
        ['home_visit', process.env.FEATURE_HOME_VISIT],
        ['insurance_integration', process.env.FEATURE_INSURANCE],
        ['whatsapp_notifications', process.env.FEATURE_WHATSAPP],
        ['loyalty_rewards', process.env.FEATURE_LOYALTY],
        ['ai_symptom_checker', process.env.FEATURE_AI_SYMPTOM],
      ].flatMap(([key, value]) => value === undefined ? [] : [[key, value === 'true']]),
    );
    featureFlags['video_calls'] = livekitReady;
    // Public signal for every upload entry point (prescription, insurance card, chat photo, profile photo, nurse/lab files):
    // false while the virus scanner cannot answer, so the clients hide the button instead of showing a form that fails.
    featureFlags['uploads_enabled'] = await this.clamav.uploadsAvailable();
    // true while a new upload is accepted but waits for its virus scan before anyone can open it (UPLOAD_SCAN=defer, scanner down)
    featureFlags['uploads_pending_scan'] = await this.clamav.uploadsPendingScan();
    // The web "under construction / trial version" notice: ON by default; an admin feature-flag row with key site_notice_enabled
    // (enabled=false) switches it off without a deploy (applied by the loop below).
    featureFlags['site_notice_enabled'] = true;
    const featureRollouts: Record<string, number> = {};
    let app_versions: Record<string, unknown> = {};
    try {
      const { rows, appVersions } = await this.dbPart.get();
      app_versions = appVersions;
      for (const row of rows) {
        const key = String(row.key || '').trim();
        if (!key) continue;
        featureFlags[key] = !!row.enabled;
        featureRollouts[key] = Math.max(0, Math.min(100, Number(row.rollout_percentage ?? 100)));
      }
    } catch {
      // Startup/DB unavailability must not take down the public configuration endpoint (and there is no earlier good copy to serve).
    }
    const numberFromEnv = (value: string | undefined) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    const pricing = Object.fromEntries(
      [
        ['vat_percentage', numberFromEnv(process.env.VAT_PERCENTAGE)],
        ['delivery_base_fee', numberFromEnv(process.env.DELIVERY_BASE_FEE)],
      ].filter(([, value]) => value !== undefined),
    );
    const contact = Object.fromEntries(
      [
        ['support_phone', process.env.SUPPORT_PHONE],
        ['support_email', process.env.SUPPORT_EMAIL],
      ].filter(([, value]) => Boolean(value)),
    );
    return {
      version: process.env.APP_VERSION || null,
      features: featureFlags,
      feature_rollouts: featureRollouts,
      pricing,
      contact,
      links: { chi_inquiry: chiInquiryUrl() },
      app_versions,
    };
  }
}
