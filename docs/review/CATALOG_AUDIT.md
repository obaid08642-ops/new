# Catalog audit: single source of truth (in progress, started 2026-10-03)

Scope: the owner's "Centralized data catalogs" brief. This is gap-only: Round 2 / Gap A already proved the admin → every-client round-trip for labs, radiology, nursing and packages, and R9–R11 (medicines, specialties, insurance) are open with the agent.

## 1. Inventory: actual counts in the QA DB `nabd_form2` (not production)

| Catalog | Authoritative collection | Count | Brief's reference |
|---|---|---|---|
| Medicines | `medicines` | 8 | ~21,000 (the import was never run on the QA DB; count on staging) |
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

## 3. Still to do in this audit
- The full consumer map (every screen → endpoint → collection) for each catalog.
- The admin CRUD matrix per field group.
- Propagation after an admin edit (caches).
- Historical snapshots in orders and bookings.
- The drug-index suggestion flow from public form → admin review → catalog.
- The jobs flow, including guest submission.
- A scan for hard-coded catalogs.
