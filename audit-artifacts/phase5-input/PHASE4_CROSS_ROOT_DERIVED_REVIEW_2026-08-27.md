# Phase 4 Cross-Root Derived-Graph Review — 2026-08-27

> **Purpose:** This is a manual reconciliation aid for existing derived-duplicate cross-links. It is not a root register, source amendment, remediation plan, or evidence that the referenced flows were run. Each listed derived ID remains a ledger observation; its appearance in more than one root row must be interpreted as a non-owning graph cross-reference unless explicitly designated otherwise in this review.

Cross-root derived IDs: **24**. The matrix below exposes the actual semantic label, frozen source reference, and every final-root row claiming the ID. No root is selected mechanically from frequency or keyword overlap.

## Reconciliation decision

A `DERIVED_DUPLICATE` is an evidence-graph edge, not an independently mapped candidate label and not an exclusive ownership assignment. Reuse across roots is retained only as a non-owning cross-reference when the frozen derived label describes a shared dependency or adjacent contract (for example payment amount authority, Redis durability, booking state, catalog publication, or provider authorization). It does not add its raw ID to any candidate, expand a root’s implementation scope, or override the direct `CONFIRMED_ROOT` mappings.

All cross-root entries below were reviewed as such graph edges. Their exact ledger semantic labels and frozen source references remain visible per entry. No entry was mechanically consolidated, reassigned, or suppressed merely to force uniqueness. The deterministic completeness test therefore requires derived IDs to exist, have `DERIVED_DUPLICATE` taxonomy and never overlap a mapped raw ID; it reports—not rejects—legitimate graph fan-out.

## `F-048`

**Ledger semantic label:** `DERIVED_DUPLICATE_CANONICAL_PHARMACY_QUOTE_OFFER_PAYMENT_IDEMPOTENCY_ROOT`

**Frozen exact evidence:** `nabd_plus_patient_app/app/pharmacy/checkout.tsx:47–89,120–177,301–333`

**Roots that cross-reference it:** R-05A1, R-06C1

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 124 | `R-06C1` | `F-781` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 125 | `R-06C1` | `F-786` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 126 | `R-06C1` | `F-777` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 173 | `R-05A1` | `F-100` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 205 | `R-06C1` | `F-779` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 206 | `R-06C1` | `F-780` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 207 | `R-06C1` | `F-776` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 249 | `R-05A1` | `F-105` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 250 | `R-05A1` | `F-106` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 254 | `R-06C1` | `F-109` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |

## `F-053`

**Ledger semantic label:** `DERIVED_DUPLICATE_CANONICAL_PHARMACY_QUOTE_OFFER_PAYMENT_IDEMPOTENCY_ROOT`

**Frozen exact evidence:** `nabd_plus_patient_app/app/pharmacy/payment.tsx:38–101,104–126,175–240`

**Roots that cross-reference it:** R-05A1, R-06C1

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 124 | `R-06C1` | `F-781` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 125 | `R-06C1` | `F-786` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 126 | `R-06C1` | `F-777` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 173 | `R-05A1` | `F-100` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 205 | `R-06C1` | `F-779` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 206 | `R-06C1` | `F-780` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 207 | `R-06C1` | `F-776` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 249 | `R-05A1` | `F-105` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 250 | `R-05A1` | `F-106` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 254 | `R-06C1` | `F-109` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |

## `F-057`

**Ledger semantic label:** `DERIVED_DUPLICATE_CANONICAL_PHARMACY_QUOTE_OFFER_PAYMENT_IDEMPOTENCY_ROOT`

**Frozen exact evidence:** `nabd_plus_patient_app/app/pharmacy/reorder.tsx:22–72,98–131`

**Roots that cross-reference it:** R-05A1, R-06C1

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 124 | `R-06C1` | `F-781` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 125 | `R-06C1` | `F-786` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 126 | `R-06C1` | `F-777` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 173 | `R-05A1` | `F-100` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 205 | `R-06C1` | `F-779` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 206 | `R-06C1` | `F-780` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 207 | `R-06C1` | `F-776` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 249 | `R-05A1` | `F-105` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 250 | `R-05A1` | `F-106` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 254 | `R-06C1` | `F-109` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |

## `F-058`

**Ledger semantic label:** `DERIVED_DUPLICATE_CANONICAL_PHARMACY_QUOTE_OFFER_PAYMENT_IDEMPOTENCY_ROOT`

**Frozen exact evidence:** `nabd_plus_patient_app/app/pharmacy/order-confirm.tsx:34–70,96–170`

**Roots that cross-reference it:** R-05A1, R-06C1

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 124 | `R-06C1` | `F-781` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 125 | `R-06C1` | `F-786` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 126 | `R-06C1` | `F-777` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 173 | `R-05A1` | `F-100` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 205 | `R-06C1` | `F-779` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 206 | `R-06C1` | `F-780` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 207 | `R-06C1` | `F-776` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 249 | `R-05A1` | `F-105` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 250 | `R-05A1` | `F-106` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 254 | `R-06C1` | `F-109` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |

## `F-078`

**Ledger semantic label:** `DERIVED_DUPLICATE_CANONICAL_INSURANCE_COPAY_SETTLEMENT_WEBHOOK_STATE_ROOT`

**Frozen exact evidence:** `nabd_plus_patient_app/app/insurance/payment-split.tsx:23–50,53–69`

**Roots that cross-reference it:** R-04A, R-04A1, R-04A2, R-05A1

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 49 | `R-04A1` | `F-2901` | Insurance policy, coverage verification and provider decision evidence have incompatible/non-persisted shapes or trust client/flag/snapshot state rather than a canonical versioned claim decision. |
| 148 | `R-04A` | `F-1488` | Doctor appointment payment/insurance runtime type contract cannot safely represent canonical insurance decision/co-pay state. |
| 173 | `R-05A1` | `F-100` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 249 | `R-05A1` | `F-105` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 250 | `R-05A1` | `F-106` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 256 | `R-04A1` | `F-2908` | Insurance policy, coverage verification and provider decision evidence have incompatible/non-persisted shapes or trust client/flag/snapshot state rather than a canonical versioned claim decision. |
| 454 | `R-04A1` | `F-174` | Insurance policy, coverage verification and provider decision evidence have incompatible/non-persisted shapes or trust client/flag/snapshot state rather than a canonical versioned claim decision. |
| 455 | `R-04A1` | `F-565` | Insurance policy, coverage verification and provider decision evidence have incompatible/non-persisted shapes or trust client/flag/snapshot state rather than a canonical versioned claim decision. |
| 479 | `R-04A2` | `F-080` | Mobile insurance screens fabricate claim/benefit/coverage success, monetary limits or renewal state instead of rendering canonical policy/claim decision data. |
| 480 | `R-04A2` | `F-077` | Mobile insurance screens fabricate claim/benefit/coverage success, monetary limits or renewal state instead of rendering canonical policy/claim decision data. |
| 481 | `R-04A2` | `F-079` | Mobile insurance screens fabricate claim/benefit/coverage success, monetary limits or renewal state instead of rendering canonical policy/claim decision data. |
| 847 | `R-04A1` | `F-173` | Insurance policy, coverage verification and provider decision evidence have incompatible/non-persisted shapes or trust client/flag/snapshot state rather than a canonical versioned claim decision. |

## `F-1280`

**Ledger semantic label:** `DERIVED_DUPLICATE_CANONICAL_INSURANCE_DECISION_COPAY_SETTLEMENT_ORCHESTRATION`

**Frozen exact evidence:** `src/modules/provider-jobs/provider-jobs.module.ts:228–250,263–267`

**Roots that cross-reference it:** R-04A, R-04A1

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 49 | `R-04A1` | `F-2901` | Insurance policy, coverage verification and provider decision evidence have incompatible/non-persisted shapes or trust client/flag/snapshot state rather than a canonical versioned claim decision. |
| 148 | `R-04A` | `F-1488` | Doctor appointment payment/insurance runtime type contract cannot safely represent canonical insurance decision/co-pay state. |
| 256 | `R-04A1` | `F-2908` | Insurance policy, coverage verification and provider decision evidence have incompatible/non-persisted shapes or trust client/flag/snapshot state rather than a canonical versioned claim decision. |
| 454 | `R-04A1` | `F-174` | Insurance policy, coverage verification and provider decision evidence have incompatible/non-persisted shapes or trust client/flag/snapshot state rather than a canonical versioned claim decision. |
| 455 | `R-04A1` | `F-565` | Insurance policy, coverage verification and provider decision evidence have incompatible/non-persisted shapes or trust client/flag/snapshot state rather than a canonical versioned claim decision. |
| 847 | `R-04A1` | `F-173` | Insurance policy, coverage verification and provider decision evidence have incompatible/non-persisted shapes or trust client/flag/snapshot state rather than a canonical versioned claim decision. |

## `F-1490`

**Ledger semantic label:** `DERIVED_DUPLICATE_CONSULTATION_SLOT_ATOMIC_CAPACITY_LOCK`

**Frozen exact evidence:** `src/modules/doctors/doctors.schemas.ts:75–77`

**Roots that cross-reference it:** R-03A, R-03B

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 11 | `R-03A` | `F-543` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 135 | `R-03A` | `F-895` | Consultation slot calendar accepts timezone/calendar semantics outside the canonical atomic slot contract. |
| 149 | `R-03B` | `F-907` | Doctor availability/profile scope/version is not reconciled to the canonical booking eligibility state. |
| 306 | `R-03A` | `F-713` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 309 | `R-03A` | `F-673` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 310 | `R-03A` | `F-671` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 311 | `R-03A` | `F-676` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 312 | `R-03A` | `F-674` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 313 | `R-03A` | `F-675` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 330 | `R-03A` | `F-338` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 693 | `R-03A` | `F-549` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 793 | `R-03A` | `F-672` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |

## `F-1493`

**Ledger semantic label:** `DERIVED_DUPLICATE_DOCTOR_APPOINTMENT_CHAT_PARTICIPANT_AUTHORIZATION`

**Frozen exact evidence:** `src/modules/doctors/doctors.schemas.ts:79–88`

**Roots that cross-reference it:** R-03B, R-18B

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 27 | `R-18B` | `F-308` | Chat/family/appointment communication trusts client participant/sender state, permits arbitrary membership, lacks relationship/booking fail-closed checks, durable message/unread/replay lifecycle and bounded safe content/media policy. |
| 61 | `R-18B` | `F-315` | Chat/family/appointment communication trusts client participant/sender state, permits arbitrary membership, lacks relationship/booking fail-closed checks, durable message/unread/replay lifecycle and bounded safe content/media policy. |
| 62 | `R-18B` | `F-313` | Chat/family/appointment communication trusts client participant/sender state, permits arbitrary membership, lacks relationship/booking fail-closed checks, durable message/unread/replay lifecycle and bounded safe content/media policy. |
| 63 | `R-18B` | `F-316` | Chat/family/appointment communication trusts client participant/sender state, permits arbitrary membership, lacks relationship/booking fail-closed checks, durable message/unread/replay lifecycle and bounded safe content/media policy. |
| 64 | `R-18B` | `F-310` | Chat/family/appointment communication trusts client participant/sender state, permits arbitrary membership, lacks relationship/booking fail-closed checks, durable message/unread/replay lifecycle and bounded safe content/media policy. |
| 65 | `R-18B` | `F-311` | Chat/family/appointment communication trusts client participant/sender state, permits arbitrary membership, lacks relationship/booking fail-closed checks, durable message/unread/replay lifecycle and bounded safe content/media policy. |
| 67 | `R-18B` | `F-314` | Chat/family/appointment communication trusts client participant/sender state, permits arbitrary membership, lacks relationship/booking fail-closed checks, durable message/unread/replay lifecycle and bounded safe content/media policy. |
| 146 | `R-18B` | `F-904` | Chat/family/appointment communication trusts client participant/sender state, permits arbitrary membership, lacks relationship/booking fail-closed checks, durable message/unread/replay lifecycle and bounded safe content/media policy. |
| 147 | `R-03B` | `F-1492` | Doctor appointment contract lacks a legal state transition matrix. |
| 167 | `R-18B` | `F-934` | Chat/family/appointment communication trusts client participant/sender state, permits arbitrary membership, lacks relationship/booking fail-closed checks, durable message/unread/replay lifecycle and bounded safe content/media policy. |
| 185 | `R-03B` | `F-596` | Hospital appointment transitions lack a canonical compare-and-set state/audit/event lifecycle. |
| 472 | `R-18B` | `F-052` | Chat/family/appointment communication trusts client participant/sender state, permits arbitrary membership, lacks relationship/booking fail-closed checks, durable message/unread/replay lifecycle and bounded safe content/media policy. |
| 730 | `R-18B` | `F-900` | Chat/family/appointment communication trusts client participant/sender state, permits arbitrary membership, lacks relationship/booking fail-closed checks, durable message/unread/replay lifecycle and bounded safe content/media policy. |
| 851 | `R-18B` | `F-309` | Chat/family/appointment communication trusts client participant/sender state, permits arbitrary membership, lacks relationship/booking fail-closed checks, durable message/unread/replay lifecycle and bounded safe content/media policy. |

## `F-1847`

**Ledger semantic label:** `DERIVED_DUPLICATE_INSURANCE_CATALOG_PREFLIGHT_POSTFLIGHT_INTEGRITY_RECONCILIATION_REPORT`

**Frozen exact evidence:** `scripts/reconcile-insurance-catalog.ts:76–80`

**Roots that cross-reference it:** R-04B, R-04E

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 59 | `R-04E` | `F-1836` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |
| 194 | `R-04B` | `F-2899` | Public insurance network/catalog exposure lacks verified publication/governance filtering, minimum public rule projection and typed validated catalog mutation contract. |
| 380 | `R-04E` | `F-1835` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |
| 388 | `R-04E` | `F-1839` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |
| 389 | `R-04E` | `F-1837` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |
| 395 | `R-04E` | `F-1838` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |
| 606 | `R-04B` | `F-2898` | Public insurance network/catalog exposure lacks verified publication/governance filtering, minimum public rule projection and typed validated catalog mutation contract. |
| 658 | `R-04E` | `F-1840` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |
| 669 | `R-04B` | `F-2897` | Public insurance network/catalog exposure lacks verified publication/governance filtering, minimum public rule projection and typed validated catalog mutation contract. |
| 671 | `R-04E` | `F-1843` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |
| 682 | `R-04E` | `F-1845` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |

## `F-1848`

**Ledger semantic label:** `DERIVED_DUPLICATE_INSURANCE_CATALOG_CONTENT_ADDRESSED_MANIFEST_PROVENANCE`

**Frozen exact evidence:** `scripts/reconcile-insurance-catalog.ts:30,65–67`

**Roots that cross-reference it:** R-04B, R-04E

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 59 | `R-04E` | `F-1836` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |
| 194 | `R-04B` | `F-2899` | Public insurance network/catalog exposure lacks verified publication/governance filtering, minimum public rule projection and typed validated catalog mutation contract. |
| 380 | `R-04E` | `F-1835` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |
| 388 | `R-04E` | `F-1839` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |
| 389 | `R-04E` | `F-1837` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |
| 395 | `R-04E` | `F-1838` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |
| 606 | `R-04B` | `F-2898` | Public insurance network/catalog exposure lacks verified publication/governance filtering, minimum public rule projection and typed validated catalog mutation contract. |
| 658 | `R-04E` | `F-1840` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |
| 669 | `R-04B` | `F-2897` | Public insurance network/catalog exposure lacks verified publication/governance filtering, minimum public rule projection and typed validated catalog mutation contract. |
| 671 | `R-04E` | `F-1843` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |
| 682 | `R-04E` | `F-1845` | Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report. |

## `F-196`

**Ledger semantic label:** `DERIVED_DUPLICATE_REDIS_FALLBACK_DURABLE_WEBHOOK_INBOX_PROVIDER_EVENT_ID_IDEMPOTENCY_PROCESSING_OUTCOME`

**Frozen exact evidence:** `src/modules/webhooks/webhooks.service.ts:65–105`

**Roots that cross-reference it:** R-16A, R-22B

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 351 | `R-16A` | `F-437` | Redis degrades to per-process non-atomic/fake-ready primitives, has ambiguous connection health, lossy pubsub, unsafe rate-limit failover, unbounded key scanning and untyped corruption semantics. |
| 384 | `R-16A` | `F-443` | Redis degrades to per-process non-atomic/fake-ready primitives, has ambiguous connection health, lossy pubsub, unsafe rate-limit failover, unbounded key scanning and untyped corruption semantics. |
| 425 | `R-16A` | `F-439` | Redis degrades to per-process non-atomic/fake-ready primitives, has ambiguous connection health, lossy pubsub, unsafe rate-limit failover, unbounded key scanning and untyped corruption semantics. |
| 498 | `R-16A` | `F-438` | Redis degrades to per-process non-atomic/fake-ready primitives, has ambiguous connection health, lossy pubsub, unsafe rate-limit failover, unbounded key scanning and untyped corruption semantics. |
| 512 | `R-16A` | `F-442` | Redis degrades to per-process non-atomic/fake-ready primitives, has ambiguous connection health, lossy pubsub, unsafe rate-limit failover, unbounded key scanning and untyped corruption semantics. |
| 690 | `R-16A` | `F-440` | Redis degrades to per-process non-atomic/fake-ready primitives, has ambiguous connection health, lossy pubsub, unsafe rate-limit failover, unbounded key scanning and untyped corruption semantics. |
| 782 | `R-16A` | `F-441` | Redis degrades to per-process non-atomic/fake-ready primitives, has ambiguous connection health, lossy pubsub, unsafe rate-limit failover, unbounded key scanning and untyped corruption semantics. |
| 805 | `R-16A` | `F-436` | Redis degrades to per-process non-atomic/fake-ready primitives, has ambiguous connection health, lossy pubsub, unsafe rate-limit failover, unbounded key scanning and untyped corruption semantics. |
| 849 | `R-22B` | `F-193` | Webhook acceptance can accept missing/non-production secret configuration or reconstructed JSON instead of exact signed provider bytes. |
| 850 | `R-22B` | `F-195` | Webhook acceptance can accept missing/non-production secret configuration or reconstructed JSON instead of exact signed provider bytes. |

## `F-240`

**Ledger semantic label:** `DERIVED_DUPLICATE_EINVOICE_SETTLED_PAYMENT_AMOUNT_AUTHORITY`

**Frozen exact evidence:** `src/modules/billing/billing.module.ts:79–87,27–43`

**Roots that cross-reference it:** R-05A1, R-05D

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 153 | `R-05D` | `F-243` | E-invoice lifecycle derives/saves fiscal numbers and booking totals without canonical settlement event linkage, reversal/credit-note/refund transitions or durable reconciliation/audit lifecycle. |
| 173 | `R-05A1` | `F-100` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 249 | `R-05A1` | `F-105` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 250 | `R-05A1` | `F-106` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 255 | `R-05D` | `F-982` | Commercial settlement/invoice/reporting can use non-authoritative amount, currency, period or ledger sources and lacks reconciliation boundary. |
| 339 | `R-05D` | `F-238` | Commercial settlement/invoice/reporting can use non-authoritative amount, currency, period or ledger sources and lacks reconciliation boundary. |
| 645 | `R-05D` | `F-597` | Commercial settlement/invoice/reporting can use non-authoritative amount, currency, period or ledger sources and lacks reconciliation boundary. |

## `F-2442`

**Ledger semantic label:** `DERIVED_DUPLICATE_CART_COMMAND_IDEMPOTENCY_OPENAPI_CONTRACT`

**Frozen exact evidence:** `src/config/openapi.config.ts:83–85`

**Roots that cross-reference it:** R-06C1, R-22D

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 124 | `R-06C1` | `F-781` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 125 | `R-06C1` | `F-786` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 126 | `R-06C1` | `F-777` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 205 | `R-06C1` | `F-779` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 206 | `R-06C1` | `F-780` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 207 | `R-06C1` | `F-776` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 238 | `R-22D` | `F-2446` | Security configuration and API/documentation surfaces lack controlled secret/config validation, trusted origin/CORS/CSP/body-limit policy, safe OpenAPI session contract/route parity and build-context secret exclusion. |
| 239 | `R-22D` | `F-2441` | Manually injected OpenAPI operations use generic object schemas and omit complete typed request/response/error/sensitive-field contracts. |
| 240 | `R-22D` | `F-2444` | Security configuration and API/documentation surfaces lack controlled secret/config validation, trusted origin/CORS/CSP/body-limit policy, safe OpenAPI session contract/route parity and build-context secret exclusion. |
| 254 | `R-06C1` | `F-109` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 358 | `R-22D` | `F-2407` | Security configuration and API/documentation surfaces lack controlled secret/config validation, trusted origin/CORS/CSP/body-limit policy, safe OpenAPI session contract/route parity and build-context secret exclusion. |
| 365 | `R-22D` | `F-2411` | Security configuration and API/documentation surfaces lack controlled secret/config validation, trusted origin/CORS/CSP/body-limit policy, safe OpenAPI session contract/route parity and build-context secret exclusion. |
| 366 | `R-22D` | `F-2409` | Security configuration and API/documentation surfaces lack controlled secret/config validation, trusted origin/CORS/CSP/body-limit policy, safe OpenAPI session contract/route parity and build-context secret exclusion. |
| 694 | `R-22D` | `F-226` | Security configuration and API/documentation surfaces lack controlled secret/config validation, trusted origin/CORS/CSP/body-limit policy, safe OpenAPI session contract/route parity and build-context secret exclusion. |
| 742 | `R-22D` | `F-1295` | Security configuration and API/documentation surfaces lack controlled secret/config validation, trusted origin/CORS/CSP/body-limit policy, safe OpenAPI session contract/route parity and build-context secret exclusion. |
| 757 | `R-22D` | `F-1291` | Security configuration and API/documentation surfaces lack controlled secret/config validation, trusted origin/CORS/CSP/body-limit policy, safe OpenAPI session contract/route parity and build-context secret exclusion. |
| 762 | `R-22D` | `F-1293` | Security configuration and API/documentation surfaces lack controlled secret/config validation, trusted origin/CORS/CSP/body-limit policy, safe OpenAPI session contract/route parity and build-context secret exclusion. |
| 798 | `R-22D` | `F-1298` | Security configuration and API/documentation surfaces lack controlled secret/config validation, trusted origin/CORS/CSP/body-limit policy, safe OpenAPI session contract/route parity and build-context secret exclusion. |
| 819 | `R-22D` | `F-2077` | Security configuration and API/documentation surfaces lack controlled secret/config validation, trusted origin/CORS/CSP/body-limit policy, safe OpenAPI session contract/route parity and build-context secret exclusion. |

## `F-2553`

**Ledger semantic label:** `DERIVED_DUPLICATE_EVENTBUS_IDEMPOTENCY_CORRELATION_CAUSATION_ORDERING_DELIVERY_CONTRACT`

**Frozen exact evidence:** `src/common/events.ts:1–48`

**Roots that cross-reference it:** R-06C1, R-09A

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 124 | `R-06C1` | `F-781` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 125 | `R-06C1` | `F-786` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 126 | `R-06C1` | `F-777` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 154 | `R-09A` | `F-842` | The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. |
| 155 | `R-09A` | `F-832` | The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. |
| 156 | `R-09A` | `F-834` | The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. |
| 157 | `R-09A` | `F-836` | The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. |
| 158 | `R-09A` | `F-840` | The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. |
| 205 | `R-06C1` | `F-779` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 206 | `R-06C1` | `F-780` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 207 | `R-06C1` | `F-776` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 254 | `R-06C1` | `F-109` | Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. |
| 416 | `R-09A` | `F-2554` | The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. |
| 418 | `R-09A` | `F-608` | The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. |
| 419 | `R-09A` | `F-609` | The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. |
| 534 | `R-09A` | `F-610` | The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. |
| 559 | `R-09A` | `F-843` | The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. |
| 560 | `R-09A` | `F-835` | The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. |
| 632 | `R-09A` | `F-607` | The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. |
| 732 | `R-09A` | `F-841` | The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. |
| 826 | `R-09A` | `F-2559` | The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. |

## `F-540`

**Ledger semantic label:** `DERIVED_DUPLICATE_CANONICAL_OPERATIONAL_PII_PURPOSE_PROJECTION_ROOT_DRIVERS_BROAD_ORDER_SHIFT_DOCUMENTS`

**Frozen exact evidence:** `src/modules/drivers/drivers.service.ts:93–103,155–159`

**Roots that cross-reference it:** R-11A, R-11B

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 97 | `R-11A` | `F-981` | Driver location, shift, delivery assignment/reassignment and delivery quote policies lack verified relationship/eligibility, atomic claim, telemetry validation and versioned durable fulfillment truth. |
| 141 | `R-11A` | `F-986` | Driver location, shift, delivery assignment/reassignment and delivery quote policies lack verified relationship/eligibility, atomic claim, telemetry validation and versioned durable fulfillment truth. |
| 397 | `R-11A` | `F-534` | Driver location, shift, delivery assignment/reassignment and delivery quote policies lack verified relationship/eligibility, atomic claim, telemetry validation and versioned durable fulfillment truth. |
| 398 | `R-11A` | `F-541` | Driver location, shift, delivery assignment/reassignment and delivery quote policies lack verified relationship/eligibility, atomic claim, telemetry validation and versioned durable fulfillment truth. |
| 399 | `R-11B` | `F-537` | Delivery proof signature/photo is raw media without validated scoped proof asset/ownership/retention contract. |
| 408 | `R-11A` | `F-539` | Driver location, shift, delivery assignment/reassignment and delivery quote policies lack verified relationship/eligibility, atomic claim, telemetry validation and versioned durable fulfillment truth. |
| 409 | `R-11A` | `F-536` | Driver location, shift, delivery assignment/reassignment and delivery quote policies lack verified relationship/eligibility, atomic claim, telemetry validation and versioned durable fulfillment truth. |
| 460 | `R-11A` | `F-533` | Driver location, shift, delivery assignment/reassignment and delivery quote policies lack verified relationship/eligibility, atomic claim, telemetry validation and versioned durable fulfillment truth. |

## `F-544`

**Ledger semantic label:** `DERIVED_DUPLICATE_CANONICAL_PAYMENT_REFUND_LEDGER_SAGA_CARE_CANCEL_REFUND_FIELDS_EVENT_STATE_TRANSITION_SEPARATE_WRITES`

**Frozen exact evidence:** `src/modules/care/appointments.service.ts:276–324`

**Roots that cross-reference it:** R-05A1, R-05B1

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 173 | `R-05A1` | `F-100` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 247 | `R-05B1` | `F-792` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 249 | `R-05A1` | `F-105` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 250 | `R-05A1` | `F-106` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 293 | `R-05B1` | `F-802` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 294 | `R-05B1` | `F-107` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 295 | `R-05B1` | `F-641` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 298 | `R-05B1` | `F-479` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 307 | `R-05B1` | `F-483` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 485 | `R-05B1` | `F-063` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 486 | `R-05B1` | `F-064` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 650 | `R-05B1` | `F-791` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |

## `F-545`

**Ledger semantic label:** `DERIVED_DUPLICATE_APPOINTMENT_SLOT_ATOMICITY_ROOT_F543_RESCHEDULE_CLONE_THEN_TRANSITION_COMPENSATING_DELETE`

**Frozen exact evidence:** `src/modules/care/appointments.service.ts:373–428`

**Roots that cross-reference it:** R-03A, R-03B

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 11 | `R-03A` | `F-543` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 185 | `R-03B` | `F-596` | Hospital appointment transitions lack a canonical compare-and-set state/audit/event lifecycle. |
| 306 | `R-03A` | `F-713` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 309 | `R-03A` | `F-673` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 310 | `R-03A` | `F-671` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 311 | `R-03A` | `F-676` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 312 | `R-03A` | `F-674` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 313 | `R-03A` | `F-675` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 330 | `R-03A` | `F-338` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 435 | `R-03B` | `F-699` | Direct cancellation path bypasses canonical versioned booking/payment/refund saga and can orphan state. |
| 693 | `R-03A` | `F-549` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |
| 793 | `R-03A` | `F-672` | Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. |

## `F-606`

**Ledger semantic label:** `DERIVED_DUPLICATE_CUSTOM_SERVICES_ROUTE_RBAC_PROVIDER_ASSIGNMENT_STATUS_WORKFLOW_SCOPE`

**Frozen exact evidence:** `src/modules/custom-services/custom-services.module.ts:8–15 ; src/modules/custom-services/custom-services.controller.ts:7–18`

**Roots that cross-reference it:** R-02A, R-16C

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 30 | `R-02A` | `F-599` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 269 | `R-02A` | `F-954` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 456 | `R-02A` | `F-886` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 513 | `R-02A` | `F-600` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 531 | `R-02A` | `F-647` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 663 | `R-02A` | `F-891` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 721 | `R-02A` | `F-932` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 751 | `R-02A` | `F-651` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 812 | `R-16C` | `F-603` | Custom-service status update allows any enum transition by any caller reaching the route, without assignment/facility authority, transition graph, version/CAS/idempotency, actor/reason audit or durable outcome delivery. |

## `F-626`

**Ledger semantic label:** `DERIVED_DUPLICATE_PROVIDER_ONBOARDING_MODERATION_CONTRACT_COMMAND_IDEMPOTENCY`

**Frozen exact evidence:** `src/modules/provider-onboarding/provider-onboarding.module.ts:45–78,195–269,441–472`

**Roots that cross-reference it:** R-07B3, R-21D

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 274 | `R-21D` | `F-624` | Provider onboarding lacks a verified provider identity/credential and account-provenance gate, encrypted/retained typed draft and minimum progress projection, default-deny contract visibility, durable submit/moderation and immutable resubmission review-state lifecycle. |
| 275 | `R-21D` | `F-618` | Provider onboarding lacks a verified provider identity/credential and account-provenance gate, encrypted/retained typed draft and minimum progress projection, default-deny contract visibility, durable submit/moderation and immutable resubmission review-state lifecycle. |
| 407 | `R-07B3` | `F-621` | Provider contract PDF flow fetches arbitrary external URL/inline PII base64 and hashes nonfinal bytes, lacking safe private artifact/version/provenance lifecycle. |
| 598 | `R-21D` | `F-622` | Provider onboarding lacks a verified provider identity/credential and account-provenance gate, encrypted/retained typed draft and minimum progress projection, default-deny contract visibility, durable submit/moderation and immutable resubmission review-state lifecycle. |
| 602 | `R-21D` | `F-616` | Provider onboarding lacks a verified provider identity/credential and account-provenance gate, encrypted/retained typed draft and minimum progress projection, default-deny contract visibility, durable submit/moderation and immutable resubmission review-state lifecycle. |
| 603 | `R-21D` | `F-617` | Provider onboarding lacks a verified provider identity/credential and account-provenance gate, encrypted/retained typed draft and minimum progress projection, default-deny contract visibility, durable submit/moderation and immutable resubmission review-state lifecycle. |
| 664 | `R-07B3` | `F-620` | Provider contract PDF flow fetches arbitrary external URL/inline PII base64 and hashes nonfinal bytes, lacking safe private artifact/version/provenance lifecycle. |
| 767 | `R-21D` | `F-615` | Provider onboarding lacks a verified provider identity/credential and account-provenance gate, encrypted/retained typed draft and minimum progress projection, default-deny contract visibility, durable submit/moderation and immutable resubmission review-state lifecycle. |
| 768 | `R-21D` | `F-623` | Provider onboarding lacks a verified provider identity/credential and account-provenance gate, encrypted/retained typed draft and minimum progress projection, default-deny contract visibility, durable submit/moderation and immutable resubmission review-state lifecycle. |
| 810 | `R-07B3` | `F-619` | Provider contract PDF flow fetches arbitrary external URL/inline PII base64 and hashes nonfinal bytes, lacking safe private artifact/version/provenance lifecycle. |

## `F-649`

**Ledger semantic label:** `DERIVED_DUPLICATE_FINANCIAL_METRICS_LEDGER_RECONCILIATION`

**Frozen exact evidence:** `src/modules/admin-governance/admin-governance.module.ts:130–142`

**Roots that cross-reference it:** R-05D, R-21C

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 255 | `R-05D` | `F-982` | Commercial settlement/invoice/reporting can use non-authoritative amount, currency, period or ledger sources and lacks reconciliation boundary. |
| 339 | `R-05D` | `F-238` | Commercial settlement/invoice/reporting can use non-authoritative amount, currency, period or ledger sources and lacks reconciliation boundary. |
| 453 | `R-05D` | `F-645` | Insurance admin financial aggregate cannot reproduce settlement scope by tenant/time/currency and risks noncanonical commercial reporting. |
| 537 | `R-21C` | `F-646` | Admin patient-360 aggregates and returns raw cross-domain order, clinical, insurance and event objects with large arbitrary windows rather than a purpose-scoped minimum projection with source/freshness/completeness evidence. |
| 645 | `R-05D` | `F-597` | Commercial settlement/invoice/reporting can use non-authoritative amount, currency, period or ledger sources and lacks reconciliation boundary. |

## `F-803`

**Ledger semantic label:** `DERIVED_DUPLICATE_REFUND_REBOOK_ADMIN_OVERRIDE_COMMAND_IDEMPOTENCY`

**Frozen exact evidence:** `src/modules/patient-ux/patient-ux.module.ts:144–164,271–290`

**Roots that cross-reference it:** R-03B, R-05B1

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 245 | `R-03B` | `F-795` | Patient rebook lacks a canonical appointment state transition binding the next slot, quote, payment/insurance and prescription context. |
| 247 | `R-05B1` | `F-792` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 293 | `R-05B1` | `F-802` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 294 | `R-05B1` | `F-107` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 295 | `R-05B1` | `F-641` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 298 | `R-05B1` | `F-479` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 307 | `R-05B1` | `F-483` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 435 | `R-03B` | `F-699` | Direct cancellation path bypasses canonical versioned booking/payment/refund saga and can orphan state. |
| 485 | `R-05B1` | `F-063` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 486 | `R-05B1` | `F-064` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |
| 650 | `R-05B1` | `F-791` | Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. |

## `F-880`

**Ledger semantic label:** `DERIVED_DUPLICATE_PROVIDER_OPERATION_AUTHORIZATION_ASSIGNMENT_STATE_TRANSITION_IDEMPOTENCY_ROOT_F891_NURSING_GPS`

**Frozen exact evidence:** `src/modules/provider-ops/provider-ops.module.ts:268–275`

**Roots that cross-reference it:** R-02A, R-11B

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 30 | `R-02A` | `F-599` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 269 | `R-02A` | `F-954` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 456 | `R-02A` | `F-886` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 513 | `R-02A` | `F-600` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 531 | `R-02A` | `F-647` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 663 | `R-02A` | `F-891` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 721 | `R-02A` | `F-932` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |
| 734 | `R-11B` | `F-666` | Facility/home-care attendance GPS check-in/out lacks a unified shift/actor/CAS/geofence/range/accuracy/freshness/rate contract. |
| 735 | `R-11B` | `F-665` | Facility/home-care attendance GPS check-in/out lacks a unified shift/actor/CAS/geofence/range/accuracy/freshness/rate contract. |
| 743 | `R-11B` | `F-724` | Facility/home-care attendance GPS check-in/out lacks a unified shift/actor/CAS/geofence/range/accuracy/freshness/rate contract. |
| 751 | `R-02A` | `F-651` | Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. |

## `F-968`

**Ledger semantic label:** `DERIVED_DUPLICATE_BOOKING_ATTACHMENT_CANONICAL_RESOURCE_MEDIA_CONTRACT`

**Frozen exact evidence:** `src/modules/booking-ops/booking-ops.module.ts:50–56,163–169`

**Roots that cross-reference it:** R-03D, R-07B1

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 462 | `R-07B1` | `F-212` | Media upload creates/trusts an asset before content validation, completion, scan, hash, idempotency and durable cleanup/reconciliation are established. |
| 463 | `R-07B1` | `F-215` | Media upload creates/trusts an asset before content validation, completion, scan, hash, idempotency and durable cleanup/reconciliation are established. |
| 464 | `R-07B1` | `F-211` | Media upload creates/trusts an asset before content validation, completion, scan, hash, idempotency and durable cleanup/reconciliation are established. |
| 547 | `R-03D` | `F-967` | Booking-ops invoice/attachment reads expose broad actor/document data without purpose-safe projection, approved secure asset lifecycle or signed relationship-bound delivery authorization. |
| 548 | `R-03D` | `F-966` | Booking-ops invoice/attachment reads expose broad actor/document data without purpose-safe projection, approved secure asset lifecycle or signed relationship-bound delivery authorization. |
| 549 | `R-03D` | `F-962` | Booking-ops invoice/attachment reads expose broad actor/document data without purpose-safe projection, approved secure asset lifecycle or signed relationship-bound delivery authorization. |

## `F-970`

**Ledger semantic label:** `DERIVED_DUPLICATE_BOOKING_PAYMENT_MEDIA_COMMAND_IDEMPOTENCY_OUTBOX`

**Frozen exact evidence:** `src/modules/booking-ops/booking-ops.module.ts:123–160,180–189`

**Roots that cross-reference it:** R-03C, R-05A1, R-07B1

| Mapping row | Root | Candidate raw IDs | Cause of claimant |
|---:|---|---|---|
| 113 | `R-03C` | `F-973` | Booking-ops commands permit weak domain-owner/facility/provider/license resolution, direct payment/insurance marking, weak DTO enum/payload boundaries and parallel orchestration that bypasses canonical booking authority. |
| 173 | `R-05A1` | `F-100` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 249 | `R-05A1` | `F-105` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 250 | `R-05A1` | `F-106` | Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. |
| 462 | `R-07B1` | `F-212` | Media upload creates/trusts an asset before content validation, completion, scan, hash, idempotency and durable cleanup/reconciliation are established. |
| 463 | `R-07B1` | `F-215` | Media upload creates/trusts an asset before content validation, completion, scan, hash, idempotency and durable cleanup/reconciliation are established. |
| 464 | `R-07B1` | `F-211` | Media upload creates/trusts an asset before content validation, completion, scan, hash, idempotency and durable cleanup/reconciliation are established. |
| 642 | `R-05A1` | `F-963` | Booking payment state can be marked outside the canonical PSP/ledger authority. |
| 714 | `R-03C` | `F-972` | Booking-ops commands permit weak domain-owner/facility/provider/license resolution, direct payment/insurance marking, weak DTO enum/payload boundaries and parallel orchestration that bypasses canonical booking authority. |
| 715 | `R-03C` | `F-971` | Booking-ops commands permit weak domain-owner/facility/provider/license resolution, direct payment/insurance marking, weak DTO enum/payload boundaries and parallel orchestration that bypasses canonical booking authority. |
| 716 | `R-03C` | `F-964` | Booking-ops commands permit weak domain-owner/facility/provider/license resolution, direct payment/insurance marking, weak DTO enum/payload boundaries and parallel orchestration that bypasses canonical booking authority. |
| 717 | `R-03C` | `F-960` | Booking-ops commands permit weak domain-owner/facility/provider/license resolution, direct payment/insurance marking, weak DTO enum/payload boundaries and parallel orchestration that bypasses canonical booking authority. |
| 718 | `R-03C` | `F-965` | Booking-ops commands permit weak domain-owner/facility/provider/license resolution, direct payment/insurance marking, weak DTO enum/payload boundaries and parallel orchestration that bypasses canonical booking authority. |
