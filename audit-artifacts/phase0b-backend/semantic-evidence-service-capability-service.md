# Phase 0B semantic evidence — service-capability.service.ts

**Archive member:** `src/modules/provider/services/service-capability.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–219; full 219-line member covered.

Lines 2–29 import capability schemas/repositories for pharmacy, labs, radiology, doctor sessions, home-care and delivery zones, define provider-role assertion, and inject the six repositories. Lines 31–49 implement provider-scoped pharmacy list/upsert/delete; upsert requires SKU/name but spreads arbitrary body fields and uses provider+SKU as filter. Lines 51–71 implement equivalent lab list/upsert/delete keyed by provider+code. Lines 73–93 implement radiology list/upsert/delete keyed by provider+scan_type+body_part. Lines 95–115 implement doctor-session list/upsert/delete keyed by provider+consultation_type+specialty. Lines 117–137 implement home-care list/upsert/delete keyed by provider+service_type.

Lines 139–167 implement delivery-zone list/upsert/delete. Zone upsert validates name, circle center/radius or polygon with at least three points, updates by provider+ID or creates with provider ID, but does not validate polygon geometry, coordinate ranges, radius bounds, overlap, or idempotency.

Lines 169–214 implement internal capability checks. Pharmacy extracts SKU/name items; if no items, any available inventory qualifies; otherwise it returns matches and a sum of `price || 0`. Lab extracts code/name tests, optionally filters home collection support, sums prices and considers the provider eligible when eligible items are at least 50% of requested codes. Radiology checks available scan/body part and returns one price. Doctor checks available consultation type and one price. Home-care checks available service type, computes hourly price times requested/default hours, and returns eligibility/price. Lines 216–219 return active delivery zones for an arbitrary provider account ID.

**Security/ownership:** CRUD methods enforce provider role and provider account scoping. Internal helpers `hasCapabilityFor` and `getZonesFor` accept arbitrary provider IDs without caller or tenant context; they rely on internal consumers. Arbitrary request payloads are used for matching, with no visible size/schema normalization.

**Truthfulness/financial:** capability prices are read directly from provider catalog records and default to zero when absent; no currency, effective date, tax, insurance, payment, ledger or final-price authority is visible. Lab matching accepts partial coverage at 50% but returns `ok` while exposing only matched items and a partial sum, creating a risk that downstream code interprets capability as fulfillment. Home-care pricing trusts client-supplied duration hours and provider hourly price without visible bounds or authoritative booking quote. Empty pharmacy/lab/radiology payloads qualify any available capability.

**Mutation integrity:** all upserts use read/write repository operations without explicit idempotency, audit, transaction, version/CAS, approval or uniqueness guarantee beyond repository filters. Body spreading permits fields beyond the intended capability contract. Deletes are not replay-safe by contract and return not-found on repeated calls.

**State/transitions:** capability records toggle availability via arbitrary body fields for most domains; no explicit status transition or publication workflow is visible. Zones can be active by query but active-state mutation is not governed here.

**Privacy/operational:** patient data is not directly stored here, but payload-derived item names/codes are used in capability queries. No rate/performance bound or batching is visible; matching can issue multiple repository queries per provider.

**Price/payment/insurance source:** provider catalog `price`, doctor `price`, home-care `hourly_price`, and pharmacy/lab sums; all lack currency/ledger/insurance verification.

**Test implications:** require provider owner/stranger/unauth tests, strict DTO/field allowlists, idempotency/CAS/audit/transaction tests, capability partial-match semantics, zero/missing-price handling, currency/effective-date provenance, duration bounds, zone geometry validation, arbitrary provider-ID access controls, and matching performance limits. No tests executed during this semantic read.
