# Phase 0B semantic evidence — Seed service

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/seed/seed.service.ts:2–348`

`SeedService` runs on module initialization. It always seeds system config, medicines and labs; patient/pharmacy/facility/doctor/provider/delivery/inventory fixtures are gated by `NODE_ENV === 'test' && ALLOW_TEST_SEED === 'true'` (`seed.service.ts:25–65`). All initialization errors are caught and logged without rethrowing, allowing application startup to continue after partial seed failure (`40–65`).

Reference seeding uses upserts keyed by Arabic names or stable keys, but facilities are `$set`-updated with seed values and labs use unordered insert with swallowed errors (`67–85,313–319`). Test patient/provider identities include plaintext seed passwords in source data usage, synthetic contact details and clinical data; extra provider creation embeds fixed passwords and real-looking Arabic facility/provider identities (`88–262`). Doctor/pharmacy/provider seeds force active/license-approved states and prices/ratings/hours from fixtures (`108–188`).

Inventory seeding deterministically distributes medicines, stock quantities and prices across pharmacies and suppresses insert errors; it exits when any inventory exists, so partial inventory cannot be repaired (`265–311`). System config seeds default broadcast stages and follow-up hours only when absent, with no visible schema/version/owner audit (`321–347`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: startup database writes, fail-open seed errors, embedded test credentials/PII, fixture approval/status contamination, partial inventory drift, swallowed duplicate errors and unversioned operational configuration.
