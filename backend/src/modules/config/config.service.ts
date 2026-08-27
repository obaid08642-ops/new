import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class ConfigService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  /**
   * Environment values provide the boot-safe baseline. Administrative flags
   * are then read from the canonical store and override that baseline, making
   * rollout controls effective for every client that consumes /config.
   */
  async getClientConfig() {
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
    return {
      version: process.env.APP_VERSION || null,
      features: featureFlags,
      feature_rollouts: featureRollouts,
      pricing,
      contact,
    };
  }
}
