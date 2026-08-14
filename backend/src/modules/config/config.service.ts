import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  getClientConfig() {
    return {
      version: '1.0.0',
      api_base_url: process.env.API_BASE_URL || 'https://api.nabdahplus.com/api/v1',
      features: {
        telehealth: process.env.FEATURE_TELEHEALTH !== 'false',
        home_visit: process.env.FEATURE_HOME_VISIT !== 'false',
        insurance_integration: process.env.FEATURE_INSURANCE !== 'false',
        whatsapp_notifications: process.env.FEATURE_WHATSAPP === 'true',
        loyalty_rewards: process.env.FEATURE_LOYALTY !== 'false',
        ai_symptom_checker: process.env.FEATURE_AI_SYMPTOM !== 'false',
      },
      pricing: {
        vat_percentage: 15,
        delivery_base_fee: 10,
      },
      contact: {
        support_phone: '920000000',
        support_email: 'support@nabdah.com',
      },
    };
  }
}
