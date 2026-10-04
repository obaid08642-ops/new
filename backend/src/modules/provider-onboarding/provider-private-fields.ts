/**
 * Provider profile fields that must never leave the backend on a public or
 * patient-facing provider listing: payout bank details, identity numbers,
 * the provider's signature and its commercial terms with the platform.
 */
export const PROVIDER_PRIVATE_FIELDS = [
  'iban',
  'bank_account_name',
  'national_id',
  'tax_number',
  'signature_url',
  'commission_rate',
  'commission_cash_pct',
  'commission_insurance_pct',
] as const;

/** Mongo projection that drops the private fields (plus internals and documents). */
export const PROVIDER_PUBLIC_PROJECTION: Record<string, 0> = {
  _id: 0,
  __v: 0,
  license_documents: 0,
  ...Object.fromEntries(PROVIDER_PRIVATE_FIELDS.map((f) => [f, 0])),
};

/** Copy of a provider profile without the private fields. */
export function withoutProviderPrivateFields<T extends Record<string, unknown>>(p: T): T {
  const out: Record<string, unknown> = { ...p };
  for (const f of PROVIDER_PRIVATE_FIELDS) delete out[f];
  return out as T;
}
