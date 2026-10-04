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

/**
 * The ONLY provider-profile fields a public or patient-facing read may return
 * (allowlist). A denylist leaked whatever it forgot: registration_steps holds a
 * verbatim copy of the registration wizard (IBAN, CR and licence numbers),
 * plus rosters, admin notes and approval data.
 */
export const PROVIDER_PUBLIC_FIELDS = [
  'id', 'slug', 'user_id', 'account_id', 'type', 'provider_type', 'status', 'public_eligibility', 'medical_review_status', 'license_verified',
  'name_ar', 'name_en', 'display_name_ar', 'display_name_en', 'title', 'specialty', 'specialties', 'sub_specialties', 'academic_degree',
  'years_experience', 'bio', 'languages', 'gender_pref', 'profile_photo', 'logo', 'clinic_name', 'clinic_images', 'hospital', 'facility_id',
  'phone', 'city', 'district', 'region', 'address', 'clinic_address', 'location', 'geo', 'service_area_cities',
  'rating', 'reviews_count', 'rating_avg', 'rating_count', 'is_online', 'availability',
  'consultation_modes', 'price_clinic', 'price_online', 'price_home', 'consultation_fee', 'online_consultation_fee', 'home_visit_fee',
  'clinic_duration', 'video_duration', 'home_duration', 'schedule_clinic', 'schedule_video', 'schedule_home', 'working_hours',
  'accepted_insurance', 'accepts_insurance', 'insurance_clinic', 'insurance_online', 'insurance_home', 'accepts_cash',
  'home_visit_supported', 'home_visit_radius_km', 'coverage_radius_km', 'target_genders',
  'has_own_delivery', 'delivery_radius_km', 'max_delivery_radius_km', 'estimated_delivery_time', 'delivery_fee', 'free_delivery_above',
  'min_order_sar', 'express_delivery', 'express_fee', 'express_minutes', 'rx_dispensing', 'otc_selling', 'enabled_categories',
  'pharmacy_type', 'pharmacy_chain', 'lab_category', 'lab_accreditation', 'test_categories', 'test_prices', 'scan_prices',
  'test_turnaround_map', 'test_home_map', 'home_collection_fee', 'available_equipment_text', 'equipment_list', 'nursing_services',
  'priceVisit', 'priceHour', 'priceDay', 'priceMonth', 'emergency_level', 'has_icu_units',
] as const;

/** Mongo projection that returns only the public fields. */
export const PROVIDER_PUBLIC_PROJECTION: Record<string, 0 | 1> = {
  _id: 0,
  ...Object.fromEntries(PROVIDER_PUBLIC_FIELDS.map((f) => [f, 1])),
};

/** Copy of a provider profile with only the public fields. */
export function withoutProviderPrivateFields<T extends Record<string, unknown>>(p: T): T {
  const allowed = new Set<string>(PROVIDER_PUBLIC_FIELDS);
  return Object.fromEntries(Object.entries(p).filter(([k]) => allowed.has(k))) as T;
}
