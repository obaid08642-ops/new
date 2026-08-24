import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  getClientConfig() {
    const featureFlags = Object.fromEntries(
      [
        ['telehealth', process.env.FEATURE_TELEHEALTH],
        ['home_visit', process.env.FEATURE_HOME_VISIT],
        ['insurance_integration', process.env.FEATURE_INSURANCE],
        ['whatsapp_notifications', process.env.FEATURE_WHATSAPP],
        ['loyalty_rewards', process.env.FEATURE_LOYALTY],
        ['ai_symptom_checker', process.env.FEATURE_AI_SYMPTOM],
      ].flatMap(([key, value]) => value === undefined ? [] : [[key, value === 'true']]),
    );
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
      pricing,
      contact,
    };
  }
}
