# Catalog audit: single source of truth (in progress, started 2026-10-03)

Scope: the owner's "Centralized data catalogs" brief. This is gap-only: Round 2 / Gap A already proved the admin → every-client round-trip for labs, radiology, nursing and packages, and R9–R11 (medicines, specialties, insurance) are open with the agent.

## 1. Inventory: actual counts in the QA DB `nabd_form2` (not production)

| Catalog | Authoritative collection | Count | Brief's reference |
|---|---|---|---|
| Medicines | `medicines` | 0 (the 8 that were here were admin-test drafts and are deleted) | 20,990 in **production** (the live `llms.txt` count). The QA DB never had the import, and the export file is not in the repo |
| Insurance companies / networks (plans) | `insurance_companies` / `insurance_networks` | 34 / 59 | 30–35 |
| Lab tests | `lab_services` | 103 | ~90 |
| Radiology / imaging | `radiology_services` | 48 | ~50 |
| Home nursing | `nursing_services` | 53 | ~60 |
| Home-care packages | `homecarepackages` | 0 | — |
| Specialties | `specialties` | 25 | — |
| Conditions | `conditions` | 7 | — |
| Public projections | `public_catalog_projections` | 32 | — |
| Jobs / applications / candidates | `job_postings` / `job_applications` / `candidate_profiles` | 0 / 0 / 0 | — (workflow never exercised) |
| Drug-index suggestions | `catalog_change_requests`, `medicine_image_suggestions` | 0 / 0 | — (workflow never exercised end to end) |

## 2. Disconnected sources found so far

| Id | Severity | Where | Finding | Evidence |
|---|---|---|---|---|
| Q47 | High | website · nurse detail `/[locale]/nursing/nurses/[nurseId]` | Calls `GET /nursing/nurses/:id` (`nurse-profile.controller.ts:15`). That reads the `nurses` collection, which **nothing writes** (0 documents), so every nurse page is not found. The patient app reads the real source, `provider_profiles` via `GET /home-care/providers/:id`. | grep: no writer of `nurses`; count 0 |
| Q48 | High | website · lab detail (`lib/api/labs-server.ts:94` → `GET /labs/:id`) | `labs-compat.controller.ts:15` reads `labs_catalog` (0 documents, no writer); the catalog is `lab_services`. Root cause of Q31 for labs. | count 0; no writer |
| Q49 | Medium | backend · `labs/bookings/catalog` (`labs-engine.controller.ts:116/122`) | A second per-lab catalog in `labcatalogs` (0 documents). No client calls it. Either wire it as the per-lab price list on top of `lab_services` ids, or remove it. | grep: no client caller |

Not a defect: `GET /home-care/bookings/my` merges the canonical store with the legacy `home_care_bookings` (read-only compatibility).

| Q50 | High | website · insurance (`lib/data/insurance-companies.ts`, used by `checkout-flow.tsx`, `service-booking-modal.tsx`, `use-central-insurance.ts`) | A static list of companies is the initial value **and** the fallback, and every company gets an invented co-pay (`defaultCoPay 0.2`, `maxCoPaySar 50/75`). That is a second source plus made-up business numbers. | file |
| Q51 | Medium | provider-app · doctor `InsuranceClaimScreen.tsx:74` | Five insurers hard-coded (`Bupa, Tawuniya, MedGulf, Malath, AXA`) | file |
| Q52 | Medium | provider-app · radiology registration (`constants/index.ts` `RAD_SCANS`) | Eleven scans with preparation notes and durations hard-coded; the catalog `radiology_services` has 48 | file |

Backend: 90 reads go through the central constant `CATALOG_COLLECTIONS` (medicines 47, nursing 19, labs 11, radiology 9, insurance 4). The exceptions are Q47–Q49 above, 3 direct `collection('medicines')` calls (same collection; should use the constant), and the derived `hot_medicines` / `public_catalog_projections` (must be rebuilt from the canonical records).

## 3. Still to do in this audit
- The full consumer map (every screen → endpoint → collection) for each catalog.
- The admin CRUD matrix per field group.
- Propagation after an admin edit (caches).
- Historical snapshots in orders and bookings.
- The drug-index suggestion flow from public form → admin review → catalog.
- The jobs flow, including guest submission.
- A scan for hard-coded catalogs.
