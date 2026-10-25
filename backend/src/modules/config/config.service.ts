import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ClamavService } from '../storage/clamav.service';

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
    const featureRollouts: Record<string, number> = {};
    try {
      const rows = await this.conn.collection('feature_flags').find({}).project({ _id: 0, key: 1, enabled: 1, rollout_percentage: 1 }).toArray();
      for (const row of rows as any[]) {
        const key = String(row.key || '').trim();
        if (!key) continue;
        featureFlags[key] = !!row.enabled;
        featureRollouts[key] = Math.max(0, Math.min(100, Number(row.rollout_percentage ?? 100)));
      }
    } catch {
      // Startup/DB unavailability must not take down the public configuration endpoint.
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
    // P6.x-13: per-app force-update versions + maintenance flags (admin-managed,
    // fail-open: absent config means no enforcement).
    let app_versions: Record<string, unknown> = {};
    try {
      const doc: any = await this.conn.collection('system_configs').findOne({ key: 'app_versions' });
      if (doc?.value && typeof doc.value === 'object') app_versions = doc.value;
    } catch {
      // Startup/DB unavailability must not take down the public configuration endpoint.
    }
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
