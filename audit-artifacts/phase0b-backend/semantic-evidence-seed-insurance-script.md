# Phase 0B semantic evidence — Insurance company seed script

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/scripts/seed-insurance-companies.ts:1–38`

The script defines ten hardcoded Saudi insurance company codes and Arabic/English names (`8–19`). It describes itself as idempotent, but implements a non-atomic `findOne({code})` followed by `insertOne` per item (`27–32`); concurrent runs can both observe absence and insert duplicates unless a unique index exists, which this script neither creates nor verifies. It generates a random UUID `id` but does not use an upsert/reconciliation key or source/version metadata (`5–6,28–32`).

The script connects directly to Mongo using `MONGO_URL`, but silently defaults `DB_NAME` to `nabd` (`21–25`), with no production/environment hard stop, database identity assertion, TLS/certificate policy, collection allowlist, dry-run, approval or bounded execution mode. It writes `is_active:true` and timestamps to the raw `insurancecompanies` collection without schema validation, canonical insurer/license verification, locale provenance, lifecycle, audit/run ID, rollback or deactivation reconciliation (`25–35`). Errors are printed and process exits, but no structured redaction/alerting or guaranteed disconnect on failure is visible (`36–38`). No product code was changed and the script was not executed; no tests/builds were run during this semantic read.
