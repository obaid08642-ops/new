/**
 * Phase 21.2 — the canonical list of collections that can hold a guest's data.
 *
 * The plan requires the merge list to be "generated from the schemas so new
 * collections are not forgotten". A static list is only as good as its last
 * audit, so `guest-merge.registry.spec.ts` walks every mongoose schema in the
 * repo, reads the account-id fields each one declares, and fails when a
 * collection that can hold patient data is missing from this registry.
 *
 * Each entry lists every account-id field the collection has been written
 * under, because the same data exists under different names across modules.
 */

export interface GuestOwnedCollection {
  /** Physical Mongo collection name. */
  collection: string;
  /** Account-id fields that point at the owning user. */
  fields: string[];
  /**
   * What happens when both the guest and the target own a row:
   * - `set`    : rewrite the owner id (the common case)
   * - `merge`  : union the rows instead of rewriting (one cart per account)
   * - `dedupe` : rewrite, then drop rows that duplicate the target's own rows
   */
  rule: 'set' | 'merge' | 'dedupe';
}

export const GUEST_OWNED_COLLECTIONS: GuestOwnedCollection[] = [
  // Commerce the guest can start before an account exists.
  { collection: 'pharmacy_orders', fields: ['patient_id', 'user_id', 'patient_account_id', 'guest_id'], rule: 'set' },
  { collection: 'orders', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'unified_carts', fields: ['patient_id', 'user_id'], rule: 'merge' },
  { collection: 'transactions', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'lab_samples', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'facility_admissions', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'surgery_bookings', fields: ['patient_id', 'user_id'], rule: 'set' },

  // Care the guest can book and pay for by card or cash.
  { collection: 'appointments', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'lab_bookings', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'radiology_bookings', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'home_care_bookings', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'nursing_services', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'diagnostic_orders', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'custom_service_requests', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'slot_locks', fields: ['patient_id', 'user_id'], rule: 'set' },

  // Medical records a guest accumulates.
  { collection: 'prescriptions', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'lab_results', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'medical_reports', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'medical_profiles', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'health_records', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'medication_plans', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'medication_doses', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'medication_reminders', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'vital_readings', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'nutrition_profiles', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'nutrition_meal_logs', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'nutrition_water_logs', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'nutrition_exercise_logs', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'maternity_profiles', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'encounter_records', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'doctor_appointments', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'consultation_notes', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'doctor_chat_messages', fields: ['patient_id', 'user_id'], rule: 'set' },

  // Profile data.
  { collection: 'patient_profiles', fields: ['user_id', 'patient_id'], rule: 'set' },
  { collection: 'patient_addresses', fields: ['user_id', 'patient_id'], rule: 'dedupe' },
  { collection: 'insurance_details', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'patient_settings', fields: ['user_id', 'patient_id'], rule: 'set' },
  { collection: 'patient_crm_tags', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'family_groups', fields: ['user_id', 'owner_id'], rule: 'set' },
  { collection: 'family_members', fields: ['user_id', 'patient_id'], rule: 'set' },
  { collection: 'shared_calendar_events', fields: ['user_id', 'owner_id'], rule: 'set' },
  { collection: 'family_permission_requests', fields: ['user_id', 'owner_id'], rule: 'set' },

  // Money and after-sales.
  { collection: 'return_requests', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'refund_requests', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'reviews', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'insurance_claims', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'outbound_referrals', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'loyalty_transactions', fields: ['user_id', 'patient_id'], rule: 'set' },
  { collection: 'loyalty_challenges', fields: ['user_id', 'patient_id'], rule: 'set' },
  { collection: 'challenge_progress', fields: ['user_id', 'patient_id'], rule: 'set' },
  { collection: 'loyalty_rewards', fields: ['user_id', 'patient_id'], rule: 'set' },
  { collection: 'reward_claims', fields: ['user_id', 'patient_id'], rule: 'set' },

  // Conversations, media and engagement.
  { collection: 'pharmacy_chat_threads', fields: ['patient_account_id', 'patient_id', 'user_id'], rule: 'set' },
  { collection: 'pharmacy_chat_messages', fields: ['patient_account_id', 'patient_id', 'user_id'], rule: 'set' },
  { collection: 'chat_sessions', fields: ['user_id', 'patient_id'], rule: 'set' },
  { collection: 'support_requests', fields: ['user_id', 'patient_id'], rule: 'set' },
  { collection: 'in_app_notifications', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'system_events', fields: ['patient_account_id'], rule: 'set' },
  { collection: 'ai_interactions', fields: ['patient_id', 'user_id'], rule: 'set' },
  { collection: 'media_assets', fields: ['owner_account_id', 'owner_id', 'user_id'], rule: 'set' },
  { collection: 'profile_images_metadata', fields: ['owner_id', 'user_id'], rule: 'set' },
  { collection: 'profile_image_audit_logs', fields: ['user_id', 'owner_id'], rule: 'set' },
  { collection: 'image_processing_jobs', fields: ['owner_id', 'owner_account_id'], rule: 'set' },
  { collection: 'storage_objects', fields: ['owner_account_id', 'user_id'], rule: 'set' },
  { collection: 'search_queries', fields: ['user_id', 'patient_id'], rule: 'set' },
  { collection: 'product_views', fields: ['user_id', 'patient_id'], rule: 'set' },
  { collection: 'universal_activities', fields: ['user_id', 'patient_id'], rule: 'set' },
  { collection: 'notifications', fields: ['user_id', 'patient_id'], rule: 'set' },

  // Device-bound rows.
  { collection: 'push_tokens', fields: ['user_id'], rule: 'set' },
  { collection: 'push_engagements', fields: ['user_id'], rule: 'set' },
  { collection: 'trusted_devices', fields: ['user_id'], rule: 'set' },
  { collection: 'passkey_credentials', fields: ['user_id'], rule: 'set' },
  { collection: 'analytics_events', fields: ['user_id', 'patient_id'], rule: 'set' },
  { collection: 'loyalty_accounts', fields: ['user_id', 'patient_id'], rule: 'set' },
];

/** Fields whose value is an account id anywhere in the schemas. */
export const ACCOUNT_ID_FIELDS = [
  'user_id',
  'patient_id',
  'patient_account_id',
  'account_id',
  'owner_account_id',
  'owner_id',
  'customer_id',
  'guest_id',
];

export function registryCovers(collection: string, field: string): boolean {
  return GUEST_OWNED_COLLECTIONS.some(
    (c) => c.collection === collection && c.fields.includes(field),
  );
}
