# Phase 0B semantic evidence — pharmacy-broadcast.service.spec.ts

**Archive member:** `src/modules/pharmacy/tests/pharmacy-broadcast.service.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–299; full member covered.

Lines 1–14 import Nest testing utilities, service collaborators and exception classes. Lines 19–89 define in-memory Jest mocks for order/allocation/broadcast/inventory/profile/availability/config/medicine repositories and Redis, geo, split, notification, event, shortage and chat services. Lines 91–117 construct the service with these mocks. There are two provider registrations for `PharmacyAllocationRepository` (an empty object at line 95 and `mockAllocModel` at line 99); Nest’s effective resolution should be verified rather than assumed.

Lines 119–121 only assert service definition. Lines 123–146 test `getBroadcastStages`: configured array is returned and absent config falls back to three defaults, including radius 3. These tests do not validate malformed config, numeric bounds, ordering, timeout safety or dynamic configuration race behavior.

Lines 148–205 test `respondReject`: patient role is forbidden; missing broadcast is not found; locked broadcast is bad request; a provider not in notified_pharmacies is forbidden; a notified provider can decline and the shortage engine is called. The success path mutates an in-memory broadcast and calls `save`, but does not test atomic conditional update, duplicate decline, concurrent accept/decline, order ownership, provider tenant binding, authenticated/unauthenticated controller behavior, rejection-reason bounds, replay/idempotency or notification/event failure compensation.

Lines 207–231 test `runBestPartialMatch` fallback to SmartSplit when no partial responses exist. Lines 233–296 test selecting a partial pharmacy based on item coverage/distance/alternatives, locking the broadcast, creating allocation, changing order to negotiating_substitutes, opening chat, notifying the patient and cancelling the losing pharmacy. This is a happy-path orchestration test with hand-shaped objects. It does not assert exact scoring/tie behavior, quantity arithmetic, alternative authorization/catalog truth, price authority, duplicate allocation prevention, atomic lock/allocation/order transaction, stale broadcast/version handling, notification failure behavior, or cross-patient/pharmacy isolation.

**Coverage judgment:** The spec provides useful unit-level examples for fallback, provider notification gating, decline recording and best-partial orchestration. It is mock-only and does not constitute live contract/security coverage. There are no explicit owner/stranger/unauth tests, no idempotency/replay tests, no concurrency/transaction tests, no malformed-input/edge arithmetic tests, no persistence-index tests, and no controller HTTP status tests.

**Findings:** The tests may pass while non-atomic in-memory mutation and duplicate allocation/decision defects remain undetected. The allocation path’s external side effects are asserted only as calls, not durable exactly-once outcomes. Any production claim must be based on integration/e2e tests against real persistence and authenticated identities.

No product code was changed and no tests were executed during this semantic read.
