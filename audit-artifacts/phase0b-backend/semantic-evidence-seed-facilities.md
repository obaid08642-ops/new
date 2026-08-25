# Phase 0B semantic evidence — Facility seed dataset

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/seed/seed.facilities.ts:1–143`

`SEED_FACILITIES` exports six Riyadh healthcare facilities with slugs, Arabic/English names, types, descriptions, districts, addresses, coordinates, Unsplash logo/image URLs, phone/website, departments, insurance lists, working hours, ratings and review counts (`seed.facilities.ts:6–142`). The header asserts coordinates use real Riyadh districts and that doctors link via facility slug (`1–4`), but the member contains no source/provenance, license verification, operating-status freshness, ownership, synthetic marker, consent, image licensing/availability check or production hard stop.

The records include real-looking named organizations, telephone numbers, official-looking websites, coordinates, insurance acceptance and review/rating counts without evidence these values are verified/current (`8–140`). Several facilities are marked open 00:00–23:59 every day, which may be an operationally false availability claim (`24–30,46–52,68–74`). All images use external Unsplash URLs and there is no local asset ownership, availability/fallback policy or content-safety/license evidence (`15–18,40–41,62–63,84–85,106–107,128–129`). The module itself defines no schema validation, duplicate detection, slug uniqueness, source version/checksum, reconciliation key, rollback, retention or seed-run audit. No product code was changed and no tests/builds were executed during this semantic read.
