# Phase 0B semantic evidence — lab-catalog.schema.ts

**Archive member:** `src/modules/labs/schemas/lab-catalog.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–41; full 41-line member covered.

Lines 6–41 define a timestamped `LabCatalog` Mongoose schema. `lab_id` is a required indexed string (8–9). `test_code` is required, unique and indexed (11–12). Arabic and English test names are required (14–18). `in_lab_price` and `home_collection_price` are required numeric fields defaulting to zero (20–24). `accepts_insurance` is required and defaults false (26–27). `reference_ranges` is an array of required parameter name, numeric min/max bounds and unit string, defaulting to an empty array (29–38).

**Ownership/security:** the schema stores lab ownership as a string but does not enforce that it references an authorized provider/lab account. A global unique `test_code` (line 11) may prevent two labs from independently cataloging the same code, but no compound uniqueness `(lab_id, test_code)` is declared. No tenant isolation, audit, effective-date, approval, or write authorization is visible.

**Truthfulness/data quality:** both prices may default to zero, and no currency, tax, discount, price source, effective period, or server-side calculation metadata is stored. Insurance acceptance is a boolean, not payer/network/coverage/claim verification. Reference ranges lack age/sex/specimen/method/version context; min/max alone cannot represent many clinical ranges. Required fields are schema-level but no nonnegative/finite/range-order validation is visible.

**State/transitions:** timestamps only; no draft/active/retired/published state, approval workflow, or catalog versioning is defined.

**Price/payment/insurance source:** `in_lab_price`, `home_collection_price`, and `accepts_insurance` are the only commercial fields; zero defaults and no currency/ledger/claim fields are explicit.

**Test implications:** require compound ownership/index tests, authorization and audit, positive finite prices/currency, catalog approval/version lifecycle, insurance eligibility semantics, reference-range context, and concurrent upsert behavior. No tests executed during this semantic read.
