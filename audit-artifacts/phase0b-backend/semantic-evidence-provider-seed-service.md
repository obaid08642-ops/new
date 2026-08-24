# Phase 0B semantic evidence — provider-seed.service.ts

**Archive member:** `src/modules/provider/services/provider-seed.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–170 and 171–344; full 344-line member covered.

Lines 2–57 inject the request engine, scoring service, request/notification/profile/availability repositories and capability/zone/slot repositories. Lines 59–65 describe authenticated-provider sample seeding and assert a recognized provider role.

Lines 66–126 ensure a fixed Riyadh/Olaya profile location and ACCEPTING_ORDERS availability, create six weekly 08:00–22:00 schedule slots, and upsert a 15km Riyadh delivery circle with fixed base fee 15 and free threshold 200. Lines 128–191 upsert fixed pharmacy, lab, radiology, doctor-session and home-care capabilities with hard-coded names, prices, stock, skills, SAR currency and availability.

Lines 194–303 query seeded requests and, when fewer than five exist, create five real database requests through `createInternal`: pharmacy, lab, radiology, doctor and home-care records with fixed patient names/phones/ages/genders, addresses, clinical/request payloads, amounts and future scheduling. The records are marked `seeded: true`. Lines 305–306 recompute scoring but swallow all errors. Lines 308–323 return a seeded summary and message.

Lines 326–343 assert provider role, find seeded requests, delete those requests and related notifications, then delete all provider capability records across pharmacy/lab/radiology/doctor/home-care, the named zone and 08:00 slots. Reset is sequential/parallel across repositories and returns removed request count.

**Truthfulness:** this member explicitly creates real DB records containing fixed sample patients and fixed commercial/clinical values. Although marked `seeded`, controller exposure and environment gating must prevent these records from production/user-facing data. Seed values are not evidence of live provider inventory, price, availability, clinical data or capacity. Scoring failures are swallowed while seed returns success.

**Security/ownership:** seed/reset assert provider role and scope records by authenticated provider ID. No admin-only or environment/feature flag is visible in this member; controller routes use only `CurrentUser`. Capability and schedule records are populated without approval/licensing checks. Reset deletes all provider capability records for the provider, not only records created by this seed member except selected zone/slot filters, creating a destructive scope risk.

**Financial/clinical integrity:** amounts, prices, delivery fee and free threshold are hard-coded; no currency/ledger/tax/insurance/payment source is involved beyond literal SAR. Patient PII and clinical notes are synthetic and stored as normal records. A pharmacy item uses stock values and medication names without inventory provenance; seeded request totals are not derived from authoritative catalogs at runtime.

**Idempotency/concurrency:** upserts are keyed per provider/catalog dimensions, but no seed run lock, transaction, audit, or idempotency key is visible. The `existing.length < 5` condition can race and create more than five requests. Parallel slot/capability/reset operations can partially fail and leave inconsistent state.

**Test implications:** require production gating/deny-by-default, no seed data in public/provider views unless explicit sandbox context, seed provenance and cleanup ownership, concurrent seed idempotency, reset non-destructive scoping, scoring failure semantics, fixed-data detection, PII isolation, price/catalog consistency and audit tests. No tests executed during this semantic read.
