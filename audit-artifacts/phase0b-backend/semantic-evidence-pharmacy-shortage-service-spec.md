# Phase 0B semantic evidence — pharmacy-shortage.service.spec.ts

**Archive member:** `src/modules/pharmacy/services/pharmacy-shortage.service.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–169; full 169-line member covered.

Lines 2–6 import the service, schemas and exceptions. Lines 8–39 define four mock model surfaces: shortage flags, rejection logs, medicine, and pharmacy orders. The mocks support CRUD/query operations but no real persistence, transaction, session, event/outbox or authorization infrastructure.

Lines 41–54 build the TestingModule and clear mocks after each setup. Lines 56–58 assert service definition.

Lines 60–110 test `logRejection`: five consecutive mocked reject records trigger a medicine update to `availability_may_be_limited`; a mixed three-record sequence plus mocked seven-day count of 11 also triggers the same status. The test proves only threshold branching against synthetic records. It does not assert date filters, event/log payload, medicine ownership, exact-once behavior, atomicity between log and status update, repeated same rejection, concurrent updates or rollback.

Lines 112–142 test `logAcceptance`: when a medicine is limited, a mocked medicine record leads to a rejection-log create and status update to `none`; an admin-flagged shortage is not reset. The test does not assert that acceptance belongs to the correct pharmacy/order, that the status update is conditional on the expected prior state, or that repeated acceptance cannot corrupt status.

Lines 144–168 test `adminMarkShortage`: a patient role receives ForbiddenException; an admin can call findOneAndUpdate with client status and notes and receives the mocked result. There is no status allowlist assertion, admin tenant scope, actor audit, concurrency/CAS, note limits/redaction, idempotency or approval separation.

**Coverage gaps:** no unauthenticated/stranger/provider ownership matrix; no real model schema or index behavior; no query date verification; no exact-once/replay/concurrency/transaction tests; no order/prescription/medicine relation; no event/outbox or audit; and no negative failures from missing medicine/log/database errors. Shared mocks are cleared but not redefined per test, so stubs must be checked for contamination and false positives.

**Truthfulness/security:** threshold numbers are encoded in test expectations but not independently checked against a business contract. Admin can submit status/notes that are passed through as-is in the tested call; server-side allowlists and bounded notes are not demonstrated.

**Test implications:** add integration and contract tests for owner/stranger/unauth/admin, date-window and threshold edge cases, status CAS, exact-once rejection/acceptance, concurrent transitions, rollback/outbox, medicine/order linkage, validated admin payloads, audit attribution and data redaction. No tests executed during this semantic read.
