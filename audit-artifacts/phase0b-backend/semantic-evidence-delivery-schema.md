# Phase 0B semantic evidence — Delivery schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/delivery.schema.ts:1–26`

The timestamped `deliveries` schema defines generated ID, required indexed order ID, optional pharmacy and driver IDs, a persisted `DeliveryState` enum defaulting to `UNASSIGNED` with index, pickup/dropoff/current-location nested objects, attempts defaulting zero, optional ETA, fee, notes, signature, photo proof and delivered_at (`6–26`). Runtime state enum and order/state indexes provide basic lifecycle/query controls (`9–13`).

Pickup/dropoff/current location fields use `any` and nested numeric/string types without requiredness, coordinate range, precision, address normalization, geospatial index, timestamp/source/accuracy or spoofing controls (`14–16`). Order/pharmacy/driver identifiers have no visible cross-document ownership, tenant or role verification; driver comment is not a runtime role constraint (`9–11`). State has no transition actor/time/reason/history, optimistic version, terminal protection or idempotent assignment/delivery semantics (`12–13,23`). Attempts, ETA and fee are unconstrained numbers with no authoritative calculation, nonnegative/max bounds, currency/tax policy or payment linkage (`17–19`). Notes/signature/photo proof have no size/content/privacy/retention, private object, hash, signer identity, capture time or chain-of-custody controls (`20–22`). delivered_at has no relationship to terminal state or server event time (`23`). No code was changed and no build/test/application operation was performed during this read.
