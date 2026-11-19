# Catalogues: global concept vs market registration (Phase 1, read-only)

Evidence: `backend/src/modules/catalogs/catalogs.controller.ts:30-41` (six catalogues: insurance, labs, radiology, nursing, specialties, medicines), schemas listed in `data-classification.md`.

| catalogue | where today | global concept (same everywhere) | per-market registration / price / rules | notes |
|---|---|---|---|---|
| Specialties | `specialties` collection (admin-managed, `catalogs.controller.ts:133`) | specialty concept + names in six languages | which are offered, local regulator title, active flag | data only |
| Lab tests | `schemas/lab.schema.ts:8` `lab_services`; `modules/labs/schemas/lab-catalog.schema.ts:6` (`in_lab_price`, `home_collection_price`) | test concept (code e.g. LOINC), specimen, parameters, units | local test code/registry, price band, availability, home collection | provider price stays on the provider offering, as today (`provider_capabilities_lab`) |
| Radiology | `schemas/radiology.schema.ts:11` `radiology_services` | modality/study concept | local codes, prep text, price band | |
| Home nursing | `schemas/home-care.schema.ts:25` `nursing_services` | service concept | allowed provider licence type, price band, rules (gender, hours) | |
| Medicines | `schemas/medicine.schema.ts:6` `medicines`; `pharmacy/price-review.ts:3`; `docs/platform/INGREDIENT-NORMALIZATION-PLAN.md` (postponed) | active ingredient, form, strength (INN later), name variants | registration number (SFDA vs EDA [unverified]), trade name, ATC, Rx class, controlled, regulated price, availability | one global catalogue with SA numbers would show wrong data abroad (`MULTI-COUNTRY.md` §2.5) |
| Insurance | `catalogs/content/insurance-official.v1.json:8`, `schemas/insurance.schema.ts:22,48,71` | none (all local) | whole catalogue per market | pure Market data |
| Locations | `modules/location/schemas/location.schema.ts:6,44` tree | tree structure | rows per market (country > region > city > district) | exists; add `market_id`/country root |
| Provider offerings | `modules/service-catalog/service-catalog.module.ts:20-49` (`service_ownership`, `provider_offerings`) | n/a | provider price + `currency`; must carry `market_id` | |

Target shape: `concept` (global, id, names, ontology codes) + `registration` (`concept_id`, `market_id`, local code, status, price rule, version, effective dates). Search indexes keyed by `market_id`. Loading new market catalogues = data import (existing scripts `scripts/catalogue-apply.ts`, `import-catalog-v14.ts`), not code.
