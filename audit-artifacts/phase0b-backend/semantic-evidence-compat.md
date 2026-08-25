# Phase 0B semantic evidence — Compatibility and gap-fill surface

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/compat/compat.module.ts:2–1139`

`CompatModule` is a large gap-fill surface registering more than twenty raw-collection controllers for family chat, health medications, wearables, home-care packages, maternity vaccines, nutrition foods, offers, reports, support chat, client audit, AI interactions, consultations, facility inbox, nursing jobs, pharmacy provider operations, provider deltas/capabilities/facility operations, B2B voice-to-order, mental-health questions, provider drug index and provider dashboard (`compat.module.ts:2–8,1111–1139`). A shared `mustOwnBooking` helper returns `Forbidden` for non-owner rather than a uniform not-found contract and is not used consistently across all controllers (`32–38`).

Patient surfaces generally key queries by current user, but many return raw or broad records, omit pagination, and mutate without idempotency. Family chat has family membership lookup and bounded messages but raw message content; health meds and wearables accept manual data/source/timestamps with limited type/range/duplicate validation; wearable data permits bulk samples and arbitrary metric/value (`40–172`). Home-care package listing returns price fields directly; maternity uses a static Saudi vaccine schedule and upserts by user/baby/code; nutrition has seed-on-empty foods marked `verified:true` and raw regex search, creating factual provenance risk (`174–266`).

Reports/support/audit/AI/consultation aliases use raw collections. Report detail returns full report documents to owners, support chat creates tickets/messages in separate operations, client audit accepts arbitrary `meta/data`, and drug interaction checks a small hard-coded rule list against user medications (`341–531`). Consultation messages check appointment ownership but not participant/provider state for writes. Facility inbox derives facility identity through multiple fallback fields; calendar and active-patient endpoints expose appointment and patient PII, while mark-read does not verify matched record (`534–562`).

Nursing active jobs and notes use provider identity heuristics; notes can attach vitals to the latest active visit and GPS returns `covered:true` when no geofence exists. Pharmacy product lists expose inventory/prices/stock; shortage reporting writes pending records and admin notifications separately. Provider deltas/capability catalogs return bounded raw-derived operational data; facility audit/calendar/patients/subaccounts/shifts reveal PII and operational metadata with no visible role guard beyond authentication (`564–839`).

B2B voice-to-order parses free text, fuzzy-matches medicines and returns client-facing unit prices/estimates without creating an order or canonical quote. Mental-health assessment questions include self-harm content but have no visible crisis-routing contract. Provider drug index exposes detailed medicine warnings/interactions/contraindications and returns `{error:'not_found'}` rather than a typed 404 for missing IDs; search uses raw regex. Provider dashboard uses role-to-collection maps, mixed date/status field names, aggregates wallet totals, defaults availability to `online` when profile is absent and returns provider/patient-adjacent operational stats (`840–1109`).

The module has no visible module-level role guard; most controllers rely on `@CurrentUser` and raw identity heuristics. It mixes patient/provider/facility/admin surfaces and many mutations lack idempotency, typed DTOs, durable eventing, canonical service ownership or explicit contract versioning (`1111–1139`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: compatibility contract drift, inconsistent ownership/error semantics, raw PII/clinical exposure, seed/factual-data risks, missing idempotency/atomicity, weak provider/facility scoping, B2B price-estimate truthfulness and dashboard fallback fabrication.
