# Phase 0B semantic evidence — Seed medicines JavaScript script

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `scripts/seed-medicines.js:1–100`

The script constructs a Mongo client against a hardcoded localhost URI `mongodb://localhost:27017/nabd`, selects `medicines_master`, and connects without any environment/database identity gate, production denial, operator authorization or dry-run (`1–12`). Before insertion it executes an unconditional `deleteMany({})`, making the operation destructive and non-idempotent for the entire collection (`14–16`).

The four records are explicitly held in `mockMedicines` and contain hardcoded medicine/supplement names, active ingredients, categories, prices, images, descriptions, prescription flags, `verified: true`, forms, manufacturers, usage counts and timestamps (`18–87`). Image URLs contain the `pub-XXXX.r2.dev` placeholder and comments identify them as “Mock R2 URL” (`26,43,60,77`). The data has no canonical source, regulatory approval/registration, country/market, currency/tax/effective date, stock/availability, dosage/safety/contraindication, interaction, batch/expiry, seller or pharmacy provenance. `requires_prescription` and `verified` are hardcoded truth flags without a verification authority or enforcement contract (`28–31,45–48,62–65,79–82`).

The script uses `insertMany` after collection-wide deletion, with no deterministic upsert key, unique-index assertion, reconciliation, transaction, audit actor, version, rollback or inventory/price coupling (`14–16,89`). It logs success as four inserted medicines without validating the resulting documents or catalog completeness (`89–90`). Errors are only printed; the function does not set an explicit nonzero exit result on failure, although the client is closed in `finally` (`92–96`). The script was not executed; no product code was changed and no tests/builds were run during this semantic read.
