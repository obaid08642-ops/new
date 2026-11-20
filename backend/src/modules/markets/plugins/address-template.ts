/** Per-market address form (blueprint section 7): which fields, in which order, which are required. Data, not code. */
export interface AddressField {
  key: string;
  required: boolean;
  /** Optional validation, regex source. */
  pattern?: string;
}
export interface AddressTemplate {
  id: string;
  fields: AddressField[];
  /** Optional verification service id (Saudi short address); null = free text only. */
  verification: string | null;
}

export const SA_ADDRESS_TEMPLATE: AddressTemplate = {
  id: 'sa-short-address',
  fields: [
    { key: 'short_address', required: false, pattern: '^[A-Za-z]{4}\\d{4}$' },
    { key: 'city', required: true },
    { key: 'district', required: true },
    { key: 'street', required: true },
    { key: 'building_number', required: false },
    { key: 'postal_code', required: false },
    { key: 'landmark', required: false },
  ],
  verification: 'sa-national-address',
};
