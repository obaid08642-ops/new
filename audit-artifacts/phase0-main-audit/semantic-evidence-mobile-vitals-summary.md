# Semantic evidence — Mobile Vitals Summary

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/health/vitals.tsx:1–7` uses `apiFetch` and is not marked `@ts-nocheck`. It loads `/health/vitals/summary`, accepts either an array or `.data`, and distinguishes loading, error and empty states with retry (`:24–35,40–43`). The empty state explicitly says no default values are used and routes to `/health/vitals-log` (`:43`).

Each returned vital is keyed by `item.key`, displays server-provided label/value/unit/measurement time and navigates to `/health/vitals-log` with `type` (`:44`). The screen also offers add-reading, history and conditions/allergies actions (`:45–47`). A disclaimer says the latest reading is not a medical diagnosis (`:41`).

This screen is read/route-level evidence only. The actual vital mutation, validation, units, timestamps, duplicate submission behavior, idempotency, ownership and audit trail are in `vitals-log` and Backend contracts, not proven here. The use of `any` for the response and the absence of explicit identifier validation remain traceability gaps.

No Phase 0 remediation was made.
