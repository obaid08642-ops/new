/**
 * The commission config (`finance_config` { key: 'commissions' }) seeded when none exists. One copy for the legal
 * service and the admin finance suite, so both seed the same values that CommissionResolver and readVatRate read:
 * `service_types.<type>.percent` (commission charged) and `tax.vat_percent` (VAT on the commission).
 */
export const DEFAULT_COMMISSIONS = {
  service_types: {
    pharmacy: { percent: 10, note: 'medicine orders' },
    doctor: { percent: 15, note: 'consultations' },
    lab: { percent: 12, note: 'lab tests' },
    radiology: { percent: 12, note: 'imaging' },
    nursing: { percent: 15, note: 'home nursing' },
    ambulance: { percent: 10, note: 'emergency rides' },
  },
  provider_overrides: {} as Record<string, { percent: number; note?: string }>,
  payout_schedule: { frequency: 'weekly', day: 'sunday', minimum_payout_sar: 100, processing_days: 3 },
  tax: { vat_percent: 15, note: 'KSA VAT applied on commission only' },
};

/** Service types whose commission the admin edits (the keys of `service_types`). */
export const COMMISSION_SERVICE_TYPES = Object.keys(DEFAULT_COMMISSIONS.service_types);
