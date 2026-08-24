# Phase 0B semantic evidence — labs.seed.ts

**Archive member:** `src/modules/labs/labs.seed.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–40; full 40-line member covered.

Lines 2–4 describe a lab catalog seed intended to populate the backend on boot if the collection is empty, containing Saudi-market lab tests and five packages. Lines 5–33 define 19 individual test entries across blood, diabetes, hormones, vitamins, cardiac, kidney/liver and urine categories. Entries include Arabic/English names, short codes, category, sample type, numeric price, turnaround hours, popularity, and for some tests fasting requirements/hours. Line 33 states imaging/radiology entries were removed and live in the radiology seed.

Lines 34–40 define five packages with fixed prices and old prices, preparation instructions, fasting requirements, turnaround hours, popularity, and included service codes: comprehensive health, diabetes care, women hormones, cardiac, and advanced pregnancy.

**Truthfulness/data quality:** this is static source-controlled data, not evidence that the values are current, licensed, provider-specific, or synchronized with a live catalog. Prices and `old_price` are hard-coded. `popularity` is hard-coded and lacks a measurement period/source. The urine test is categorized as `blood` (line 32), a likely taxonomy defect. Package inclusion and discount semantics are static; no currency, effective dates, provider/lab identity, insurance coverage, availability, or price provenance is present.

**Security/ownership:** no access control or tenant semantics visible; seed behavior depends on the boot/import path. If executed in production, it could create or preserve catalog values without approval/versioning controls. The comment says populate when empty, but this member alone does not show the guard or deployment environment.

**State/transitions:** none; static array only.

**Price/payment/insurance source:** fixed prices and old prices are embedded directly; no currency, tax, payment, insurance, or ledger source.

**Test implications:** verify seed is disabled or governed in production as intended, idempotent and environment-scoped, and that catalog values have currency/effective dates/provider provenance. Add taxonomy validation for sample/category consistency and package references. No seed executed and no tests run during this semantic read.
