# Phase 0B semantic evidence — PharmacyInventory (inventory schema)

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/inventory.schema.ts:1–19`

This schema defines a timestamped `pharmacy_inventory` collection with generated ID, indexed pharmacy and medicine IDs, stock and reserved quantities defaulting to zero, optional price, availability defaulting true, optional restock time and expiry date (`5–15`). It exports a document type/factory and adds a unique compound index on `(pharmacy_id, medicine_id)` (`17–19`).

The compound uniqueness index prevents duplicate pharmacy/medicine rows. However, `stock_qty` and `reserved_qty` are unconstrained numbers with no integer/non-negative or `reserved_qty <= stock_qty` invariant, and no visible atomic reservation/decrement/version semantics (`10–11,19`). Price is an unconstrained optional number with no currency, scale, tax, effective/source or immutable history policy (`12`).

Availability has no relationship to stock, expiry, licensing, approval or publication status (`13–15`). Pharmacy/medicine identifiers have no account/facility ownership or catalog identity validation. No batch/lot/recall/quarantine, reservation expiry, idempotency, audit actor, update provenance, deletion/retention or patient-facing projection policy is represented. No operational indexes for stale/expired/available stock or reservation queues are visible beyond identifier indexes and the compound unique index (`8–15,19`). No code was changed and no build/test/application operation was performed during this read.
