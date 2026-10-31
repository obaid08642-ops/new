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
  tax: { vat_percent: 15, note: 'KSA VAT applied on commission only' },
};

/** The commission service type (a key of `service_types`) of each provider profile type. One mapping for every screen and ledger path. */
export const COMMISSION_SERVICE_BY_PROVIDER_TYPE: Record<string, string> = {
  pharmacy: 'pharmacy',
  lab: 'lab',
  radiology: 'radiology',
  home_care: 'nursing',
  nursing: 'nursing',
  nurse: 'nursing',
  doctor: 'doctor',
  clinic: 'doctor',
  hospital: 'doctor',
};

/** Service types whose commission the admin edits (the keys of `service_types`). */
export const COMMISSION_SERVICE_TYPES = Object.keys(DEFAULT_COMMISSIONS.service_types);
