/** Typed, versioned market configuration (blueprint section 3). One immutable row per version. */
export type Weekday = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
export type MarketStatus = 'draft' | 'internal_test' | 'pilot' | 'live' | 'suspended';

export interface CurrencyConfig {
  /** ISO 4217 code, e.g. SAR. */
  code: string;
  /** Number of minor-unit digits (SAR 2, BHD 3, JPY 0). Must match the ISO table. */
  exponent: number;
}

export interface TaxConfig {
  /** Scheme id of the tax/e-invoice plugin, e.g. 'ksa-vat'. */
  scheme: string;
  /** Percent, e.g. 15 for 15 %. */
  vat_percent: number;
  inclusive: boolean;
}

export interface PhoneConfig {
  /** E.164 prefix with '+'. */
  default_dial: string;
  /** Digits a national number may carry after the dial code (regex source). */
  national_number_pattern: string;
  /** Domestic trunk prefix people type before the number, '' if none. */
  trunk_prefix: string;
}

export interface BrandingConfig {
  /** Text shown as "operated by <name>". null = platform itself operates the market. The logo/identity never varies. */
  operated_by: string | null;
}

export interface MarketConfig {
  currency: CurrencyConfig;
  tax: TaxConfig;
  /** IANA zone. */
  timezone: string;
  calendar: { weekend: Weekday[] };
  locales: { default: string; enabled: string[] };
  phone: PhoneConfig;
  emergency_numbers: { ambulance: string };
  branding: BrandingConfig;
}

export interface MarketInfo {
  id: string; // ISO 3166-1 alpha-2 market key, e.g. SA
  country: string;
  operator_id: string;
  status: MarketStatus;
}

export interface OperatorInfo {
  id: string;
  /** Legal entity name; null until the owner supplies it. */
  legal_name: string | null;
  tax_registration: string | null;
}
