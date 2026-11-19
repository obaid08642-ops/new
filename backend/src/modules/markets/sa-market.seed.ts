import { MarketConfig, MarketInfo, OperatorInfo } from './market-config.types';

/**
 * Market #1: Saudi Arabia, expressed as data. Every value is what the code hard-wires today;
 * `sa-market.golden.spec.ts` compares each against the live constant so the two cannot drift.
 */
export const SA_MARKET_ID = 'SA';

export const SA_OPERATOR: OperatorInfo = { id: 'op-sa-default', legal_name: null, tax_registration: null };

export const SA_MARKET: MarketInfo = { id: SA_MARKET_ID, country: 'SA', operator_id: SA_OPERATOR.id, status: 'live' };

export const SA_CONFIG_V1: MarketConfig = {
  currency: { code: 'SAR', exponent: 2 },
  tax: { scheme: 'ksa-vat', vat_percent: 15, inclusive: false },
  timezone: 'Asia/Riyadh',
  calendar: { weekend: ['friday', 'saturday'] },
  locales: { default: 'ar', enabled: ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] },
  phone: { default_dial: '+966', national_number_pattern: '^5\\d{8}$', trunk_prefix: '0' },
  emergency_numbers: { ambulance: '997' },
  branding: { operated_by: null },
};
