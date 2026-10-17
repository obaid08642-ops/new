/**
 * The public catalogue gate for medicines: not deleted, publicly eligible and approved by medical review. Every
 * patient-facing or public read of the medicines collection starts from this filter, so an item an admin added but
 * has not approved yet (medical_review_status 'pending') never reaches a patient, a guest or an AI agent.
 * Search-engine surfaces (sitemaps) add indexing_eligibility on top. Admin, provider-inventory and internal safety
 * reads (prescription classification) keep their own filters.
 */
export function publicMedicineFilter(): { is_deleted: { $ne: true }; public_eligibility: true; medical_review_status: 'approved' } {
  return { is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' };
}
