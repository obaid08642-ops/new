# Phase 0B semantic evidence — PharmacyInventory schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/pharmacy-inventory.schema.ts:1–18`

`PharmacyInventory` is a timestamped `pharmacy_inventory` collection with generated ID, required indexed pharmacy and drug IDs, required numeric price, stock quantity defaulting to zero, online flag defaulting true and optional expiry date (`5–13`). The schema exports a document type/factory and declares a unique compound index on `(pharmacy_id, drug_id)` (`16–18`).

The compound uniqueness index is a useful protection against duplicate drug rows per pharmacy. Price and stock are unconstrained numbers: no non-negative/min/max, currency, scale/rounding, tax, effective time, source, reservation, batch/lot or expiry relationship is visible (`10–13`). `is_online` has no approval/availability/stock consistency or scheduling policy. Expiry is a single optional date with no stale-stock behavior or timezone/clock contract (`13`).

Pharmacy and drug IDs have no visible account/facility ownership, catalog identity validation or active-license boundary. No optimistic concurrency/version, atomic decrement/reservation, idempotency, audit actor, update provenance, price-history, recall/quarantine, deletion/retention or patient-facing projection policy is represented (`8–13,18`). No index for online/expiry/stock operational selection is visible beyond individual pharmacy/drug indexes and the compound unique index. No code was changed and no build/test/application operation was performed during this read.
