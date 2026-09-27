/**
 * P5.1 canonical catalog collections (single source of truth).
 * Every reader uses these constants — never a hardcoded string.
 * Data migration: backend/scripts/migrations/2026-09-unify-catalog-collections.ts
 * (dry-run default; renames legacy collections, merges on conflict).
 */
export const CATALOG_COLLECTIONS = {
  medicines: 'medicines',
  lab_services: 'lab_services',
  radiology_services: 'radiology_services',
  nursing_services: 'nursing_services',
  insurance_companies: 'insurance_companies',
  specialties: 'specialties',
} as const;

export type CatalogCollectionName = (typeof CATALOG_COLLECTIONS)[keyof typeof CATALOG_COLLECTIONS];

/** Legacy physical names renamed by the P5.1 migration. */
export const LEGACY_CATALOG_COLLECTIONS: Record<CatalogCollectionName, string> = {
  medicines: 'medicines_master',
  lab_services: 'labservices',
  radiology_services: 'radiologyservices',
  nursing_services: 'nursing_catalog',
  insurance_companies: 'insurancecompanies',
  specialties: 'specialties',
};
