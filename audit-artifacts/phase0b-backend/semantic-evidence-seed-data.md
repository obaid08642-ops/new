# Phase 0B semantic evidence — Seed dataset

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/seed/seed.data.ts:1–299` (read in two ranges due to file size)

The file exports seed users, pharmacies, doctors, delivery drivers and medicines. It contains plaintext passwords for patient, pharmacy, doctor and delivery accounts (`seed.data.ts:5–8,10–40,74–279,281–284`), including repeated predictable values such as `Doctor@123`, `Pharm@123`, `Driver@123` and `Test@123`. These are credential material in source control and are not generated/secret-injected in the dataset. The patient record is explicitly labeled “Test patient” (`5–8`).

The pharmacy and doctor records contain named individuals/organizations, phone numbers, SCFHS-like license numbers, locations, hospitals, specialties, biographies, prices, ratings, insurance lists and working hours (`10–40,74–279`). The file header calls the dataset “Real Saudi-localized data” (`1–3`), but no provenance, consent, synthetic-data marker, license verification, freshness, source version or production-safety metadata is present. The doctor data includes client-supplied-like rating and price facts and provider identifiers, with some missing facility_slug or language coverage (`74–279`).

`SEED_DELIVERY` also embeds named drivers and passwords (`281–284`). `SEED_MEDICINES` is an empty array containing only category comments (`286–298`), so any seed path expecting medicines receives no actual medicine rows; this can produce an incomplete catalog or encourage fallback/mock data elsewhere. The dataset module itself has no environment gate, expiry, revocation, credential rotation, audit/run ID, reconciliation key, idempotency, rollback or separation between non-production fixtures and production bootstrap. No product code was changed and no tests/builds were executed during this semantic read.
