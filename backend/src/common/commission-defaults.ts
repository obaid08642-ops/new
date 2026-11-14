/**
 * The commission config (`finance_config` { key: 'commissions' }) seeded when none exists. One copy for the legal
 * service and the admin finance suite, so both seed the same values that CommissionResolver and readVatRate read:
 * `service_types.<type>.percent` (commission charged) and `tax.vat_percent` (VAT on the commission).
 */
/**
 * Deployment defaults used until the admin sets a value (finance suite, commission settings): the escrow delay before a
 * provider earning can be withdrawn and the smallest withdrawal. SETTLEMENT_DELAY_DAYS / PAYOUT_MINIMUM_SAR override.
 */
const envNumber = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const n = raw === undefined || raw === '' ? NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
export const settlementDelayDefault = (): number => envNumber('SETTLEMENT_DELAY_DAYS', 3);
export const payoutMinimumDefault = (): number => envNumber('PAYOUT_MINIMUM_SAR', 100);

/**
 * THE one place the platform's commission numbers are written (`commission-single-source.spec.ts` fails if a second set appears).
 * Everything else reads `finance_config` `{ key: 'commissions' }` (through CommissionResolver for a provider's earning) and falls
 * back to these.
 *  - DEFAULT_COMMISSIONS: what an empty finance_config is seeded with (admin finance suite, legal service).
 *  - DEFAULT_COMMISSION_PERCENT: what CommissionResolver charges a service type that has no configured percent (live today as
 *    the resolver's 'system_default'); the settlement, the admin reports and the legal service all use this one number.
 *  - DEFAULT_VAT_PERCENT: VAT on the commission when finance_config has no `tax.vat_percent`.
 */
export const DEFAULT_COMMISSION_PERCENT = 10;
export const DEFAULT_VAT_PERCENT = 15;

export const DEFAULT_COMMISSIONS = {
  service_types: {
    pharmacy: { percent: 10, note: 'medicine orders' },
    doctor: { percent: 15, note: 'consultations' },
    lab: { percent: 12, note: 'lab tests' },
    radiology: { percent: 12, note: 'imaging' },
    nursing: { percent: 15, note: 'home nursing' },
  },
  provider_overrides: {} as Record<string, { percent: number; note?: string }>,
  payout_schedule: { frequency: 'weekly', day: 'sunday', minimum_payout_sar: payoutMinimumDefault(), processing_days: 3 },
  tax: { vat_percent: DEFAULT_VAT_PERCENT, note: 'KSA VAT applied on commission only' },
};

/** Service types whose commission the admin edits (the keys of `service_types`). */
export const COMMISSION_SERVICE_TYPES = Object.keys(DEFAULT_COMMISSIONS.service_types);

/**
 * The commission service type (the key of `service_types`) a provider profile type, a booking vertical or a legacy ledger
 * service name is charged under. Unknown names come back unchanged, so the resolver answers DEFAULT_COMMISSION_PERCENT.
 */
const SERVICE_TYPE_ALIASES: Record<string, string> = {
  doctor: 'doctor', clinic: 'doctor', hospital: 'doctor', consultation: 'doctor', video: 'doctor', audio: 'doctor', chat: 'doctor',
  nursing: 'nursing', home_care: 'nursing', homecare: 'nursing', home_visit: 'nursing', physiotherapy: 'nursing',
};
export const commissionServiceTypeOf = (name: string): string => SERVICE_TYPE_ALIASES[String(name || '').toLowerCase()] ?? String(name || '').toLowerCase();
