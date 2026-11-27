import { MarketConfig, MarketInfo, OperatorInfo } from '../market-config.types';
import { IdentityPlugin, maskLast3 } from '../plugins/identity.plugin';
import { AddressTemplate } from '../plugins/address-template';
import { registerAddressTemplate, registerIdentityPlugin } from '../plugins/registry';
import { LicenceType, registerLicenceTypes } from '../licences/licence-types';
import { OnboardingFieldSet, registerOnboardingFieldSets } from '../licences/onboarding-field-sets';

/**
 * INTERNAL TEST MARKET (blueprint step 11): Bahrain, status `internal_test`, NEVER a launch market. It exists to prove that nothing Saudi is hidden in the
 * foundation: a 3-decimal currency (BHD, fils), another time zone, phone shape, identity document, address form and licence types, all as DATA next to the
 * SA data and none of it by code. The names are test names (`bh-test-*`), not claims about the real regulators. It is only seeded when
 * MARKETS_INTERNAL_TEST=yes (test and staging), so production never serves it; `test-market-isolation.spec.ts` fails on any Saudi literal reachable for it.
 */
export const BH_MARKET_ID = 'BH';

export const BH_OPERATOR: OperatorInfo = { id: 'op-bh-internal-test', legal_name: null, tax_registration: null };

export const BH_MARKET: MarketInfo = { id: BH_MARKET_ID, country: 'BH', operator_id: BH_OPERATOR.id, status: 'internal_test' };

export const BH_CONFIG_V1: MarketConfig = {
  currency: { code: 'BHD', exponent: 3 },
  tax: { scheme: 'test-vat', vat_percent: 10, inclusive: false },
  timezone: 'Asia/Bahrain',
  calendar: { weekend: ['friday', 'saturday'] },
  locales: { default: 'en', enabled: ['en', 'ar'] },
  phone: { default_dial: '+973', national_number_pattern: '^[36]\\d{7}$', trunk_prefix: '', national_length: 8 },
  emergency_numbers: { ambulance: '999' },
  branding: { operated_by: null },
};

/** Nine-digit personal number (test rule: digits only, no check digit). */
export const bhIdentityPlugin: IdentityPlugin = {
  type_id: 'bh-test-personal-number',
  normalise(raw: unknown): string | null {
    const v = typeof raw === 'string' ? raw.replace(/[\s-]/g, '') : '';
    return /^\d{9}$/.test(v) ? v : null;
  },
  mask: maskLast3,
};

export const BH_ADDRESS_TEMPLATE: AddressTemplate = {
  id: 'bh-block-road-building',
  fields: [
    { key: 'flat', required: false },
    { key: 'building', required: true },
    { key: 'road', required: true },
    { key: 'block', required: true },
    { key: 'city', required: true },
  ],
  verification: null,
};

const PRACTITIONERS = ['doctor', 'nursing', 'home_care', 'pharmacy'] as const;
const FACILITIES = ['pharmacy', 'hospital', 'clinic', 'lab', 'radiology', 'nursing', 'home_care'] as const;
const ALL_TYPES = ['doctor', 'pharmacy', 'hospital', 'clinic', 'lab', 'radiology', 'home_care', 'nursing'] as const;

export const BH_LICENCE_TYPES: readonly LicenceType[] = [
  { id: 'bh-test-practitioner', jurisdiction: 'BH', issuer: 'bh-test-regulator', provider_types: PRACTITIONERS, has_expiry: true, verification: 'admin_document_review' },
  { id: 'bh-test-facility', jurisdiction: 'BH', issuer: 'bh-test-regulator', provider_types: FACILITIES, has_expiry: true, verification: 'admin_document_review' },
];

const f = (key: string, kind: 'text' | 'date' | 'iban' | 'document' | 'list', required: boolean, licence_type?: string) => ({ key, kind, required, ...(licence_type ? { licence_type } : {}) });

export const BH_ONBOARDING: readonly OnboardingFieldSet[] = ALL_TYPES.map((t): OnboardingFieldSet => {
  const practitioner = (PRACTITIONERS as readonly string[]).includes(t) && t !== 'pharmacy';
  const licence = practitioner ? 'bh-test-practitioner' : 'bh-test-facility';
  return { market: BH_MARKET_ID, provider_type: t, fields: [f('license_number', 'text', false, licence), f('license_expiry_date', 'date', false, licence), f('iban', 'iban', false), f('license_documents', 'document', false)] };
});

let registered = false;
/** Registers the BH plugins/data. Idempotent. Called only when the internal test market is seeded (never at import time, so production never has it). */
export function registerBhInternalTest(): void {
  if (registered) return;
  registerIdentityPlugin(BH_MARKET_ID, bhIdentityPlugin);
  registerAddressTemplate(BH_MARKET_ID, BH_ADDRESS_TEMPLATE);
  registerLicenceTypes(BH_MARKET_ID, BH_LICENCE_TYPES);
  registerOnboardingFieldSets(BH_MARKET_ID, BH_ONBOARDING);
  registered = true;
}
