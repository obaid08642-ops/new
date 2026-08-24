# Phase 0B semantic evidence — provider-admin.service.ts

**Archive member:** `src/modules/provider/services/provider-admin.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–100 and 101–186; full 186-line member covered.

Lines 2–21 inject account/profile/document/bank/audit repositories and EventEmitter. Lines 24–42 define best-effort image purge: values are flattened, raw URLs or storage IDs are resolved through `storage_objects`, and `storage.delete_by_url` events are emitted; errors are swallowed. Line 44 restricts callers to exact `role === 'admin'`, excluding `super_admin` unless separately normalized upstream.

Lines 46–75 list providers with optional status/type/email search, bounded page/limit, account projection without password hash, and enrichment from two provider-profile collections with fallback names. Lines 77–93 return account, profile, documents, bank and onboarding data for an admin-selected provider. Lines 95–115 return the same data keyed by common user ID, excluding deleted onboarding records.

Lines 117–122 enforce status transitions from `PROVIDER_STATUS_TRANSITIONS`, append status history and change account status. Lines 124–141 approve a provider, set approval metadata, optionally write a caller-supplied commission to profile, bulk-approve pending/under-review documents and bank records, update common provider profiles to active, audit and return account. Lines 143–164 reject a provider, set rejection state, update common profiles, audit, inspect common profile/documents and best-effort purge image/document URLs. Lines 166–176 request changes and optionally mark caller-supplied document types as needing replacement. Lines 178–185 suspend and audit.

**Security/authorization:** list/detail/action methods rely on exact admin role assertion. There is no visible `super_admin` support, CSRF/idempotency, tenant boundary, or resource-level policy beyond account ID. Detail responses include bank/KYC/onboarding records; field secrecy/redaction is not visible. `purgeImages` trusts storage IDs/raw URLs and emits deletion events without confirmation.

**Integrity/transactions:** approval/rejection/change/suspend update multiple collections sequentially without transaction/outbox/CAS. Partial failures can leave account status, common profile, document reviews, bank review, audit and storage inconsistent. Repeated approval/rejection are not idempotency-key protected. Status transition is checked in memory then saved without version guard. Approval with a supplied commission casts `Number` without range/precision/currency validation.

**Cross-model/state truthfulness:** two profile collections are updated/read together, with different schemas (`provider_profiles` common onboarding vs provider profile repository). Approval marks documents/bank approved based on record status presence, without visible expiry/content/identity verification. The common profile is set active independently of account state transaction.

**Privacy/storage:** KYC images and document URLs may be physically purged on rejection, but purge is best effort, has no durable deletion confirmation, retry or tombstone, and can leave orphaned assets. Admin detail returns complete bank/KYC data without visible redaction.

**Audit:** most actions audit once, but audit failure handling and atomicity are absent. Storage deletion is event-based and unverified.

**Price/payment/insurance source:** commission is accepted directly from admin body and stored as numeric profile field; no bounds, currency, effective period, ledger or settlement linkage visible.

**Test implications:** require admin/super-admin/unauth/tenant tests, detail PII projections, transition/CAS/idempotency, multi-collection transactions/outbox, commission validation, document review/expiry verification, storage purge retry/tombstone/confirmation, audit failure, duplicate action and role matrix tests. No tests executed during this semantic read.
